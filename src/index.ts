import { ResourceRecordSet } from '@aws-sdk/client-route-53'
import chalk from 'chalk'
import { UpsertRecordSetOptions, upsertRecordSet } from 'mindless-route53'
import {
  DescribeInstancesCommand,
  EC2Client,
  EC2ClientConfig,
} from '@aws-sdk/client-ec2'
import {
  CloudFormationClient,
  CloudFormationClientConfig,
  DescribeStacksCommand,
  Output,
} from '@aws-sdk/client-cloudformation'
import {
  DescribeLoadBalancersCommand,
  ElasticLoadBalancingV2Client,
  ElasticLoadBalancingV2ClientConfig,
} from '@aws-sdk/client-elastic-load-balancing-v2'
import { Route53Client, Route53ClientConfig } from '@aws-sdk/client-route-53'

const isECSInstanceId = (s: string) => /^i-[a-z0-9]{17,}$/.test(s)
const loadBalancerArnRx =
  /^arn:aws:elasticloadbalancing:([^:]+):(\d+):loadbalancer\/.+/
const isLoadBalancerArn = (s: string) => loadBalancerArnRx.test(s)
function isEmpty(collection: any): boolean {
  for (const key in collection) {
    if (Object.prototype.hasOwnProperty.call(collection, key)) {
      return false
    }
  }
  return true
}

export type GeneratedResourceRecordSet = {
  ResourceRecordSet: ResourceRecordSet
  PrivateZone?: boolean
  OutputKey?: string
  InstanceId?: string
  LoadBalancerArn?: string
}
export async function genRecordSetsForECSInstance(options: {
  InstanceId: string
  DNSName: string
  EC2?: EC2Client
  privateOnly?: boolean
  TTL?: number
  region?: string
  awsConfig?: EC2ClientConfig
  log?: (...args: any) => any
  verbose?: boolean
}): Promise<Array<GeneratedResourceRecordSet>> {
  const { InstanceId, DNSName, privateOnly, TTL, verbose, region } = options
  const awsConfig = options.awsConfig || {
    ...(region
      ? {
          region,
        }
      : {}),
  }
  const log = options.log || console.error.bind(console) // eslint-disable-line no-console
  const EC2 = options.EC2 || new EC2Client(awsConfig)
  if (verbose) log(`Describing EC2 Instance: ${InstanceId}...`)
  const response = await EC2.send(
    new DescribeInstancesCommand({
      InstanceIds: [InstanceId],
    })
  )
  const { Reservations } = response
  if (!Reservations?.length)
    throw new Error(`Instance not found: ${InstanceId}`)
  if (Reservations.length > 1)
    throw new Error(`Multiple reservations found for instance: ${InstanceId}`)
  const { Instances } = Reservations[0]
  if (!Instances || !Instances.length)
    throw new Error(`Instance not found: ${InstanceId}`)
  if (Instances.length > 1)
    throw new Error(`Multiple instances found for id: ${InstanceId}`)
  const { PublicIpAddress, PrivateIpAddress } = Instances[0]
  if (verbose) {
    log(
      `Got PublicIpAddress: ${String(
        PublicIpAddress
      )}, PrivateIpAddress: ${String(PrivateIpAddress)}`
    )
  }
  const result: Array<GeneratedResourceRecordSet> = []
  if (PublicIpAddress && !privateOnly) {
    result.push({
      ResourceRecordSet: {
        Name: DNSName,
        Type: 'A',
        ResourceRecords: [
          {
            Value: PublicIpAddress,
          },
        ],
      },
      InstanceId,
      PrivateZone: false,
    })
  }
  if (PrivateIpAddress) {
    result.push({
      ResourceRecordSet: {
        Name: DNSName,
        Type: 'A',
        ResourceRecords: [
          {
            Value: PrivateIpAddress,
          },
        ],
      },
      InstanceId,
      PrivateZone: true,
    })
  }
  if (TTL != null) {
    for (const { ResourceRecordSet } of result) {
      ResourceRecordSet.TTL = TTL
    }
  }
  return result
}
export async function genRecordSetsForLoadBalancer(options: {
  LoadBalancerArn: string
  DNSName: string
  privateOnly?: boolean
  ELBv2?: ElasticLoadBalancingV2Client
  log?: (...args: any) => any
  region?: string
  awsConfig?: ElasticLoadBalancingV2ClientConfig
  verbose?: boolean
}): Promise<Array<GeneratedResourceRecordSet>> {
  const { LoadBalancerArn, DNSName, privateOnly, verbose, region } = options
  const awsConfig = options.awsConfig || {
    ...(region
      ? {
          region,
        }
      : {}),
  }
  const log = options.log || console.error.bind(console) // eslint-disable-line no-console
  const ELBv2 = options.ELBv2 || new ElasticLoadBalancingV2Client(awsConfig)
  if (verbose) log(`Describing load balancer: ${LoadBalancerArn}...`)
  const response = await ELBv2.send(
    new DescribeLoadBalancersCommand({
      LoadBalancerArns: [LoadBalancerArn],
    })
  )
  const { LoadBalancers } = response
  if (!LoadBalancers?.length) {
    throw new Error(`Load balancer not found: ${LoadBalancerArn}`)
  }
  if (LoadBalancers.length > 1) {
    throw new Error(
      `More than 1 load balancer found for arn: ${LoadBalancerArn}`
    )
  }
  const balancer = LoadBalancers[0]
  const ResourceRecordSet = {
    Name: DNSName,
    Type: 'A',
    AliasTarget: {
      DNSName: balancer.DNSName,
      HostedZoneId: balancer.CanonicalHostedZoneId,
      EvaluateTargetHealth: false,
    },
  } as const
  return [
    ...(privateOnly
      ? []
      : [
          {
            ResourceRecordSet,
            LoadBalancerArn,
            PrivateZone: false,
          },
        ]),
    {
      ResourceRecordSet,
      LoadBalancerArn,
      PrivateZone: true,
    },
  ]
}
export async function genRecordSetsForStackOutputs(options: {
  Outputs: Array<Output>
  DNSName: string
  privateOnly?: boolean
  TTL?: number
  EC2?: EC2Client
  ELBv2?: ElasticLoadBalancingV2Client
  region?: string
  awsConfig?: EC2ClientConfig
  log?: (...args: any) => any
  verbose?: boolean
}): Promise<Array<GeneratedResourceRecordSet>> {
  const {
    Outputs,
    DNSName,
    privateOnly,
    TTL,
    EC2,
    ELBv2,
    awsConfig,
    region,
    verbose,
  } = options
  const log = options.log || console.error.bind(console) // eslint-disable-line no-console
  const ecsInstanceIds: {
    [key: string]: string
  } = {}
  const loadBalancerArns: {
    [key: string]: string
  } = {}
  for (const { OutputKey, OutputValue } of Outputs) {
    if (!OutputKey || !OutputValue) continue
    if (isECSInstanceId(OutputValue)) ecsInstanceIds[OutputKey] = OutputValue
    else if (isLoadBalancerArn(OutputValue))
      loadBalancerArns[OutputKey] = OutputValue
  }
  if (isEmpty(ecsInstanceIds) && isEmpty(loadBalancerArns)) {
    throw new Error(`No addressable outputs found`)
  }
  if (isEmpty(ecsInstanceIds) !== isEmpty(loadBalancerArns)) {
    if (!isEmpty(ecsInstanceIds)) {
      const result = await genRecordSetsForECSInstance({
        InstanceId: Object.values(ecsInstanceIds)[0] as any,
        DNSName,
        privateOnly,
        TTL,
        EC2,
        awsConfig,
        region,
        log,
        verbose,
      })
      result.forEach(
        (item) => (item.OutputKey = Object.keys(ecsInstanceIds)[0])
      )
      return result
    } else {
      const result = await genRecordSetsForLoadBalancer({
        LoadBalancerArn: Object.values(loadBalancerArns)[0] as any,
        DNSName,
        privateOnly,
        ELBv2,
        awsConfig,
        region,
        log,
        verbose,
      })
      result.forEach(
        (item) => (item.OutputKey = Object.keys(loadBalancerArns)[0])
      )
      return result
    }
  }
  throw new Error(`Multiple addressable outputs found!
${
  isEmpty(ecsInstanceIds)
    ? ''
    : `ECS Instances:\n  ${Object.values(ecsInstanceIds).join('\n  ')}`
}
${
  isEmpty(loadBalancerArns)
    ? ''
    : `Load Balancers:\n  ${Object.values(loadBalancerArns).join('\n  ')}`
}`)
}
export type GenRecordSetsForStackOptions = {
  StackName: string
  DNSName: string
  privateOnly?: boolean
  TTL?: number
  CloudFormation?: CloudFormationClient
  EC2?: EC2Client
  ELBv2?: ElasticLoadBalancingV2Client
  region?: string
  awsConfig?: CloudFormationClientConfig
  log?: (...args: any) => any
  verbose?: boolean
}
export async function genRecordSetsForStack(
  options: GenRecordSetsForStackOptions
): Promise<Array<GeneratedResourceRecordSet>> {
  const { StackName, DNSName, privateOnly, EC2, ELBv2, verbose, region, TTL } =
    options
  const awsConfig = options.awsConfig || {
    ...(region
      ? {
          region,
        }
      : {}),
  }
  const log = options.log || console.error.bind(console) // eslint-disable-line no-console
  const CloudFormation =
    options.CloudFormation || new CloudFormationClient(awsConfig)
  if (verbose) log(`Describing CloudFormation stack: ${StackName}`)
  const response = await CloudFormation.send(
    new DescribeStacksCommand({
      StackName,
    })
  )
  const { Stacks } = response
  if (!Stacks?.length) throw new Error(`Stack not found: ${StackName}`)
  if (Stacks.length > 1)
    throw new Error(`More than one stack found for name: ${StackName}`)
  const { Outputs = [] } = Stacks[0]
  if (verbose) log(`Got outputs: ${JSON.stringify(Outputs, null, 2)}`)
  return await genRecordSetsForStackOutputs({
    Outputs,
    DNSName,
    privateOnly,
    TTL,
    EC2,
    ELBv2,
    awsConfig,
    region,
    log,
    verbose,
  })
}
export type UpsertRecordSetsForStackOptions = GenRecordSetsForStackOptions & {
  Comment?: string
  Route53?: Route53Client
  awsConfig?: Route53ClientConfig
  waitForChanges?: boolean
}
export async function upsertRecordSetsForStack(
  options: UpsertRecordSetsForStackOptions
): Promise<void> {
  const recordSets = await genRecordSetsForStack(options)
  const log = options.log || console.error.bind(console) // eslint-disable-line no-console
  const { verbose, Comment, region, Route53, waitForChanges } = options
  const awsConfig = options.awsConfig || {
    ...(region
      ? {
          region,
        }
      : {}),
  }
  await Promise.all(
    recordSets.map(
      async ({
        ResourceRecordSet,
        PrivateZone,
      }: GeneratedResourceRecordSet): Promise<any> => {
        const upsertOptions: UpsertRecordSetOptions = {
          waitForChanges,
          Route53,
          awsConfig,
          ResourceRecordSet,
          PrivateZone,
          log,
          verbose,
        }
        if (Comment) upsertOptions.Comment = Comment
        await upsertRecordSet(upsertOptions)
      }
    )
  )
}
export function confirmationMessage(options: {
  StackName: string
  recordSets: Array<GeneratedResourceRecordSet>
}): string {
  const { StackName, recordSets } = options
  /* eslint-disable no-console */
  return `These are the DNS records that will be upserted for stack ${StackName}:

${recordSets
  .map(
    ({
      ResourceRecordSet,
      PrivateZone,
      OutputKey,
      InstanceId,
      LoadBalancerArn,
    }: GeneratedResourceRecordSet) => `${chalk.bold(
      ResourceRecordSet?.Name || ''
    )} (${PrivateZone ? 'private' : 'public'} zone)
  from stack output [${String(OutputKey)}]: ${String(
      InstanceId || LoadBalancerArn
    )}:
${JSON.stringify(ResourceRecordSet, null, 2).replace(/^/gm, '  ')}
`
  )
  .join('\n')}
  `
  /* eslint-enable no-console */
}
