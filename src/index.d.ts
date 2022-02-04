import AWS from 'aws-sdk'
import { ResourceRecordSet, StackOutput } from './AWSTypes'

export type GeneratedResourceRecordSet = {
  ResourceRecordSet: ResourceRecordSet
  PrivateZone?: boolean | null
  OutputKey?: string | null
  InstanceId?: string | null
  LoadBalancerArn?: string | null
}

export function genRecordSetsForECSInstance(options: {
  InstanceId: string
  DNSName: string
  EC2?: AWS.EC2 | null
  TTL?: number | null
  region?: string | null
  log?: null | ((...args: any) => any)
  verbose?: boolean | null
}): Promise<Array<GeneratedResourceRecordSet>>

export function genRecordSetsForLoadBalancer(options: {
  LoadBalancerArn: string
  DNSName: string
  ELBv2?: AWS.ELBv2 | null
  log?: null | ((...args: any) => any)
  region?: string | null
  verbose?: boolean | null
}): Promise<Array<GeneratedResourceRecordSet>>

export function genRecordSetsForStackOutputs(options: {
  Outputs: Array<StackOutput>
  DNSName: string
  TTL?: number | null
  EC2?: AWS.EC2 | null
  ELBv2?: AWS.ELBv2 | null
  region?: string | null
  log?: null | ((...args: any) => any)
  verbose?: boolean | null
}): Promise<Array<GeneratedResourceRecordSet>>

export type GenRecordSetsForStackOptions = {
  StackName: string
  DNSName: string
  TTL?: number | null
  interactive?: boolean | null
  CloudFormation?: AWS.CloudFormation | null
  EC2?: AWS.EC2 | null
  ELBv2?: AWS.ELBv2 | null
  region?: string | null
  log?: null | ((...args: any) => any)
  verbose?: boolean | null
}

export function genRecordSetsForStack(
  options: GenRecordSetsForStackOptions
): Promise<Array<GeneratedResourceRecordSet>>

// type UpsertOptions = $Call<<T>((T) => any) => T, typeof upsertRecordSet>

export type UpsertRecordSetsForStackOptions = GenRecordSetsForStackOptions & {
  Comment?: string | null
  Route53?: AWS.Route53 | null
}

export function upsertRecordSetsForStack(
  options: UpsertRecordSetsForStackOptions
): Promise<void>

export function confirmationMessage(options: {
  StackName: string
  recordSets: Array<GeneratedResourceRecordSet>
}): string
