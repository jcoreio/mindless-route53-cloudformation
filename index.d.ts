import AWS from 'aws-sdk'
import { UpsertRecordSetOptions } from 'mindless-route53'

export type GeneratedResourceRecordSet = {
  ResourceRecordSet: AWS.Route53.ResourceRecordSet
  PrivateZone?: boolean | null | undefined
  OutputKey?: string | null | undefined
  InstanceId?: string | null | undefined
  LoadBalancerArn?: string | null | undefined
}

export function genRecordSetsForECSInstance(options: {
  InstanceId: string
  DNSName: string
  EC2?: AWS.EC2 | null | undefined
  TTL?: number | null | undefined
  region?: string | null | undefined
  log?: ((...args: any) => any) | null | undefined
  verbose?: boolean | null | undefined
}): Promise<Array<GeneratedResourceRecordSet>>

export function genRecordSetsForLoadBalancer(options: {
  LoadBalancerArn: string
  DNSName: string
  ELBv2?: AWS.ELBv2 | null | undefined
  log?: ((...args: any) => any) | null | undefined
  region?: string | null | undefined
  verbose?: boolean | null | undefined
}): Promise<Array<GeneratedResourceRecordSet>>

export function genRecordSetsForStackOutputs(options: {
  Outputs: Array<AWS.CloudFormation.Output>
  DNSName: string
  TTL?: number | null | undefined
  EC2?: AWS.EC2 | null | undefined
  ELBv2?: AWS.ELBv2 | null | undefined
  region?: string | null | undefined
  log?: ((...args: any) => any) | null | undefined
  verbose?: boolean | null | undefined
}): Promise<Array<GeneratedResourceRecordSet>>

export type GenRecordSetsForStackOptions = {
  StackName: string
  DNSName: string
  TTL?: number | null | undefined
  interactive?: boolean | null | undefined
  CloudFormation?: AWS.CloudFormation | null | undefined
  EC2?: AWS.EC2 | null | undefined
  ELBv2?: AWS.ELBv2 | null | undefined
  region?: string | null | undefined
  log?: ((...args: any) => any) | null | undefined
  verbose?: boolean | null | undefined
}

export function genRecordSetsForStack(
  options: GenRecordSetsForStackOptions
): Promise<Array<GeneratedResourceRecordSet>>

export type UpsertRecordSetsForStackOptions = UpsertRecordSetOptions & {
  Comment?: string | null | undefined
  Route53?: AWS.Route53 | null | undefined
}

export function upsertRecordSetsForStack(
  options: UpsertRecordSetsForStackOptions
): Promise<void>

export function confirmationMessage(options: {
  StackName: string
  recordSets: Array<GeneratedResourceRecordSet>
}): string
