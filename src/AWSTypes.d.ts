// $FlowFixMe

import * as t from 'typed-validators'

export type ResourceRecord = {
  Value: string
}

export type AliasTarget = {
  DNSName: string
  EvaluateTargetHealth: boolean
  HostedZoneId: string
}

export type GeoLocation = {
  ContinentCode?: string
  CountryCode?: string
  SubdivisionCode?: string
}

export type ResourceRecordSetType =
  | 'SOA'
  | 'A'
  | 'TXT'
  | 'NS'
  | 'CNAME'
  | 'MX'
  | 'NAPTR'
  | 'PTR'
  | 'SRV'
  | 'SPF'
  | 'AAAA'
  | 'CAA'

export type Failover = 'PRIMARY' | 'SECONDARY'

export type ResourceRecordSet = {
  Name: string
  Type: ResourceRecordSetType
  AliasTarget?: AliasTarget
  Failover?: Failover
  GeoLocation?: GeoLocation
  HealthCheckId?: string
  MultiValueAnswer?: boolean
  Region?: string
  ResourceRecords?: Array<ResourceRecord>
  SetIdentifier?: string
  TTL?: number
  TrafficPolicyInstanceId?: string
  Weight?: number
}

export type StackOutput = {
  OutputKey: string
  OutputValue?: string | null
  Description?: string | null
  ExportName?: string | null
}

export const StackOutputType: t.TypeAlias<StackOutput>

export type StackDescription = {
  StackName: string
  Outputs?: Array<StackOutput> | null
}

export const StackDescriptionType: t.TypeAlias<StackDescription>

export type DescribeStacksResponse = {
  Stacks: Array<StackDescription>
}

export const DescribeStacksResponseType: t.TypeAlias<DescribeStacksResponse>

export type InstanceDescription = {
  PrivateIpAddress?: string | null
  PublicIpAddress?: string | null
  State: {
    Code: number
    Name: string
  }
  StateTransitionReason?: string | null
  SubnetId: string
  VpcId: string
}

export const InstanceDescriptionType: t.TypeAlias<InstanceDescription>

export type ReservationDescription = {
  Instances?: Array<InstanceDescription>
}

export const ReservationDescriptionType: t.TypeAlias<ReservationDescription>

export type DescribeInstancesResponse = {
  Reservations: Array<ReservationDescription>
}

export const DescribeInstancesResponseType: t.TypeAlias<DescribeInstancesResponse>

export type LoadBalancerDescription = {
  LoadBalancerArn: string
  DNSName: string
  CanonicalHostedZoneId: string
}

export const LoadBalancerDescriptionType: t.TypeAlias<LoadBalancerDescription>

export type DescribeLoadBalancersResponse = {
  LoadBalancers: Array<LoadBalancerDescription>
}

export const DescribeLoadBalancersResponseType: t.TypeAlias<DescribeLoadBalancersResponse>
