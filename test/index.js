// @flow

import { describe, it } from 'mocha'
import { expect } from 'chai'
import { genRecordSetsForStack } from '../src'

describe(`genRecordSetsForStack`, function() {
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
  }
  const CloudFormation = {
    describeStacks: ({ StackName }) => ({
      promise: async () => ({ Stacks: [stacks[StackName]].filter(Boolean) }),
    }),
  }

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
  }
  const EC2 = {
    describeInstances: ({ InstanceIds }) => ({
      promise: async () => ({
        Reservations: [
          {
            Instances: InstanceIds.map(id => ec2Instances[id]).filter(Boolean),
          },
        ],
      }),
    }),
  }
  const loadBalancers = {
    [loadBalancerArn]: {
      LoadBalancerArn: loadBalancerArn,
      DNSName: `test--nlb-ffffffffffffffff.elb.${region}.amazonaws.com`,
      CanonicalHostedZoneId: 'ZZZZZZZZZZZZZZ',
    },
  }
  const ELBv2 = {
    describeLoadBalancers: ({ LoadBalancerArns }) => ({
      promise: async () => ({
        LoadBalancers: LoadBalancerArns.map(arn => loadBalancers[arn]).filter(
          Boolean
        ),
      }),
    }),
  }
  it(`works for EC2 instance output`, async function() {
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
  it(`works for load balancer output`, async function() {
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
            EvaluateTargetHealth: true,
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
            EvaluateTargetHealth: true,
          },
        },
        PrivateZone: true,
        OutputKey: 'NetworkLoadBalancer',
        LoadBalancerArn: loadBalancerArn,
      },
    ])
  })
  it(`rejects if no addressable outputs are found`, async function() {
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
  it(`rejects if multiple addressable outputs are found`, async function() {
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
