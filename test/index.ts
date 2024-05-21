import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { genRecordSetsForStack, upsertRecordSetsForStack } from '../src'
import { DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import { DescribeInstancesCommand } from '@aws-sdk/client-ec2'
import { DescribeLoadBalancersCommand } from '@aws-sdk/client-elastic-load-balancing-v2'
import {
  ChangeResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommandInput,
  ListHostedZonesByNameCommand,
} from '@aws-sdk/client-route-53'
const region = 'us-west-2'
const loadBalancerArn = `arn:aws:elasticloadbalancing:${region}:000000000000:loadbalancer/net/test--nlb/ffffffffffffffff`
const ec2InstanceId = 'i-00000000000000000'
const stacks = {
  ec2Instance: {
    StackName: 'ec2instance',
    Outputs: [
      {
        OutputKey: 'EC2Instance',
        OutputValue: ec2InstanceId,
      },
      {
        OutputKey: 'blah',
        OutputValue: 'foo',
      },
    ],
  },
  loadBalancer: {
    StackName: 'loadBalancer',
    Outputs: [
      {
        OutputKey: 'NetworkLoadBalancer',
        OutputValue: loadBalancerArn,
      },
      {
        OutputKey: 'blah',
        OutputValue: 'foo',
      },
    ],
  },
  noAddressable: {
    StackName: 'noAddressable',
    Outputs: [
      {
        OutputKey: 'foo',
        OutputValue: 'bar',
      },
      {
        OutputKey: 'blah',
        OutputValue: 'blah',
      },
    ],
  },
  multipleAddressable: {
    StackName: 'multipleAddressable',
    Outputs: [
      {
        OutputKey: 'NetworkLoadBalancer',
        OutputValue: loadBalancerArn,
      },
      {
        OutputKey: 'EC2Instance',
        OutputValue: ec2InstanceId,
      },
    ],
  },
} as const
const CloudFormation = {
  async send(command: any) {
    if (command instanceof DescribeStacksCommand) {
      const { StackName = '' } = command.input
      return {
        Stacks: [(stacks as any)[StackName]].filter(Boolean),
      }
    }
    throw new Error('unsupported command')
  },
} as any
const ec2Instances = {
  [ec2InstanceId]: {
    PrivateIpAddress: '1.2.3.4',
    PublicIpAddress: '5.6.7.8',
    State: {
      Code: 16,
      Name: 'running',
    },
    SubnetId: 'subnet-00000000',
    VpcId: 'vpc-00000000',
  },
} as const
const EC2 = {
  async send(command: any) {
    if (command instanceof DescribeInstancesCommand) {
      const { InstanceIds = [] } = command.input
      return {
        Reservations: [
          {
            Instances: InstanceIds.map(
              (id) => (ec2Instances as any)[id]
            ).filter(Boolean),
          },
        ],
      }
    }
    throw new Error('unsupported command')
  },
} as any
const loadBalancers = {
  [loadBalancerArn]: {
    LoadBalancerArn: loadBalancerArn,
    DNSName: `test--nlb-ffffffffffffffff.elb.${region}.amazonaws.com`,
    CanonicalHostedZoneId: 'ZZZZZZZZZZZZZZ',
  },
} as const
const ELBv2 = {
  async send(command: any) {
    if (command instanceof DescribeLoadBalancersCommand) {
      const { LoadBalancerArns = [] } = command.input
      return {
        LoadBalancers: LoadBalancerArns.map(
          (arn) => (loadBalancers as any)[arn]
        ).filter(Boolean),
      }
    }
    throw new Error('unsupported command')
  },
} as any
const zones = [
  {
    Id: '/hostedzone/AAAAAAAAAAAAA',
    Name: 'bar.com.',
    Config: {
      PrivateZone: false,
    },
    ResourceRecordSetCount: 67,
  },
  {
    Id: '/hostedzone/BBBBBBBBBBBBB',
    Name: 'bar.com.',
    Config: {
      PrivateZone: true,
    },
    ResourceRecordSetCount: 68,
  },
  {
    Id: '/hostedzone/CCCCCCCCCCCCC',
    Name: 'foo.com.',
    Config: {
      PrivateZone: false,
    },
    ResourceRecordSetCount: 68,
  },
  {
    Id: '/hostedzone/DDDDDDDDDDDDD',
    Name: 'foo.com.',
    Config: {
      PrivateZone: true,
    },
    ResourceRecordSetCount: 68,
  },
]
const changeResourceRecordSetsArgs: Array<ChangeResourceRecordSetsCommandInput> =
  []
const Route53 = {
  async send(command: any) {
    if (command instanceof ListHostedZonesByNameCommand) {
      const { DNSName, HostedZoneId } = command.input
      const i = zones.findIndex(
        (z) =>
          z.Id === HostedZoneId ||
          (DNSName && z.Name.endsWith(DNSName.replace(/\.?$/, '.')))
      )
      return i < 0
        ? {
            HostedZones: [],
            IsTruncated: false,
          }
        : {
            HostedZones: zones.slice(i, i + 2),
            IsTruncated: i + 2 < zones.length,
            NextHostedZoneId: i + 2 < zones.length ? zones[i + 2].Id : null,
            NextDNSName: i + 2 < zones.length ? zones[i + 2].Name : null,
          }
    }
    if (command instanceof ChangeResourceRecordSetsCommand) {
      changeResourceRecordSetsArgs.push(command.input)
      return {
        ChangeInfo: {
          Id: 'xxxxxx',
        },
      }
    }
    throw new Error('unsupported command')
  },
} as any
beforeEach(() => {
  changeResourceRecordSetsArgs.length = 0
})
describe(`genRecordSetsForStack`, function () {
  it(`works for EC2 instance output`, async function () {
    expect(
      await genRecordSetsForStack({
        StackName: 'ec2Instance',
        DNSName: 'test.foo.com',
        CloudFormation,
        EC2,
        ELBv2,
        log: () => {},
      })
    ).to.deep.equal([
      {
        ResourceRecordSet: {
          Name: 'test.foo.com',
          Type: 'A',
          ResourceRecords: [
            {
              Value: ec2Instances[ec2InstanceId].PublicIpAddress,
            },
          ],
        },
        PrivateZone: false,
        OutputKey: 'EC2Instance',
        InstanceId: ec2InstanceId,
      },
      {
        ResourceRecordSet: {
          Name: 'test.foo.com',
          Type: 'A',
          ResourceRecords: [
            {
              Value: ec2Instances[ec2InstanceId].PrivateIpAddress,
            },
          ],
        },
        PrivateZone: true,
        OutputKey: 'EC2Instance',
        InstanceId: ec2InstanceId,
      },
    ])
  })
  it(`works for load balancer output`, async function () {
    expect(
      await genRecordSetsForStack({
        StackName: 'loadBalancer',
        DNSName: 'test.foo.com',
        CloudFormation,
        EC2,
        ELBv2,
        log: () => {},
      })
    ).to.deep.equal([
      {
        ResourceRecordSet: {
          Name: 'test.foo.com',
          Type: 'A',
          AliasTarget: {
            DNSName: loadBalancers[loadBalancerArn].DNSName,
            HostedZoneId: loadBalancers[loadBalancerArn].CanonicalHostedZoneId,
            EvaluateTargetHealth: false,
          },
        },
        PrivateZone: false,
        OutputKey: 'NetworkLoadBalancer',
        LoadBalancerArn: loadBalancerArn,
      },
      {
        ResourceRecordSet: {
          Name: 'test.foo.com',
          Type: 'A',
          AliasTarget: {
            DNSName: loadBalancers[loadBalancerArn].DNSName,
            HostedZoneId: loadBalancers[loadBalancerArn].CanonicalHostedZoneId,
            EvaluateTargetHealth: false,
          },
        },
        PrivateZone: true,
        OutputKey: 'NetworkLoadBalancer',
        LoadBalancerArn: loadBalancerArn,
      },
    ])
  })
  it(`rejects if no addressable outputs are found`, async function () {
    await expect(
      genRecordSetsForStack({
        StackName: 'noAddressable',
        DNSName: 'test.foo.com',
        CloudFormation,
        EC2,
        ELBv2,
        log: () => {},
      })
      // $FlowFixMe
    ).to.be.rejectedWith(Error, 'No addressable outputs found')
  })
  it(`rejects if multiple addressable outputs are found`, async function () {
    await expect(
      genRecordSetsForStack({
        StackName: 'multipleAddressable',
        DNSName: 'test.foo.com',
        CloudFormation,
        EC2,
        ELBv2,
        log: () => {},
      })
      // $FlowFixMe
    ).to.be.rejectedWith(Error, /Multiple addressable outputs found!/)
  })
})
describe(`upsertRecordSetsForStack`, function () {
  it.skip(`works for EC2 instance output`, async function () {
    const DNSName = 'test.foo.com'
    const TTL = 360
    await upsertRecordSetsForStack({
      StackName: 'ec2Instance',
      DNSName,
      CloudFormation,
      EC2,
      ELBv2,
      Route53,
      TTL,
      log: () => {},
      waitForChanges: false,
    })
    expect(changeResourceRecordSetsArgs).to.deep.equal([
      {
        ChangeBatch: {
          Changes: [
            {
              Action: 'UPSERT',
              ResourceRecordSet: {
                Name: DNSName,
                Type: 'A',
                ResourceRecords: [
                  {
                    Value: ec2Instances[ec2InstanceId].PublicIpAddress,
                  },
                ],
                TTL,
              },
            },
          ],
          Comment: undefined,
        },
        HostedZoneId: '/hostedzone/CCCCCCCCCCCCC',
      },
      {
        ChangeBatch: {
          Changes: [
            {
              Action: 'UPSERT',
              ResourceRecordSet: {
                Name: DNSName,
                Type: 'A',
                ResourceRecords: [
                  {
                    Value: ec2Instances[ec2InstanceId].PrivateIpAddress,
                  },
                ],
                TTL,
              },
            },
          ],
          Comment: undefined,
        },
        HostedZoneId: '/hostedzone/DDDDDDDDDDDDD',
      },
    ])
  })
  it.skip(`works for load balancer output`, async function () {
    const DNSName = 'test.foo.com'
    await upsertRecordSetsForStack({
      StackName: 'loadBalancer',
      DNSName,
      CloudFormation,
      EC2,
      ELBv2,
      Route53,
      log: () => {},
      waitForChanges: false,
    })
    expect(changeResourceRecordSetsArgs).to.deep.equal([
      {
        ChangeBatch: {
          Changes: [
            {
              Action: 'UPSERT',
              ResourceRecordSet: {
                Name: DNSName,
                Type: 'A',
                AliasTarget: {
                  DNSName: loadBalancers[loadBalancerArn].DNSName,
                  HostedZoneId:
                    loadBalancers[loadBalancerArn].CanonicalHostedZoneId,
                  EvaluateTargetHealth: false,
                },
              },
            },
          ],
          Comment: undefined,
        },
        HostedZoneId: '/hostedzone/CCCCCCCCCCCCC',
      },
      {
        ChangeBatch: {
          Changes: [
            {
              Action: 'UPSERT',
              ResourceRecordSet: {
                Name: DNSName,
                Type: 'A',
                AliasTarget: {
                  DNSName: loadBalancers[loadBalancerArn].DNSName,
                  HostedZoneId:
                    loadBalancers[loadBalancerArn].CanonicalHostedZoneId,
                  EvaluateTargetHealth: false,
                },
              },
            },
          ],
          Comment: undefined,
        },
        HostedZoneId: '/hostedzone/DDDDDDDDDDDDD',
      },
    ])
  })
  it(`rejects if no addressable outputs are found`, async function () {
    await expect(
      upsertRecordSetsForStack({
        StackName: 'noAddressable',
        DNSName: 'test.foo.com',
        CloudFormation,
        EC2,
        ELBv2,
        Route53,
        log: () => {},
        waitForChanges: false,
      })
      // $FlowFixMe
    ).to.be.rejectedWith(Error, 'No addressable outputs found')
    expect(changeResourceRecordSetsArgs).to.have.lengthOf(0)
  })
  it(`rejects if multiple addressable outputs are found`, async function () {
    await expect(
      upsertRecordSetsForStack({
        StackName: 'multipleAddressable',
        DNSName: 'test.foo.com',
        CloudFormation,
        EC2,
        ELBv2,
        Route53,
        log: () => {},
        waitForChanges: false,
      })
      // $FlowFixMe
    ).to.be.rejectedWith(Error, /Multiple addressable outputs found!/)
    expect(changeResourceRecordSetsArgs).to.have.lengthOf(0)
  })
})
