// @flow
// @flow-runtime enable

import { reify } from 'flow-runtime'
import type { Type } from 'flow-runtime'

export type ResourceRecord = {
  Value: string,
}

export type AliasTarget = {
  DNSName: string,
  EvaluateTargetHealth: boolean,
  HostedZoneId: string,
}

export type GeoLocation = {
  ContinentCode?: string,
  CountryCode?: string,
  SubdivisionCode?: string,
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
  Name: string,
  Type: ResourceRecordSetType,
  AliasTarget?: AliasTarget,
  Failover?: Failover,
  GeoLocation?: GeoLocation,
  HealthCheckId?: string,
  MultiValueAnswer?: boolean,
  Region?: string,
  ResourceRecords?: Array<ResourceRecord>,
  SetIdentifier?: string,
  TTL?: number,
  TrafficPolicyInstanceId?: string,
  Weight?: number,
}

export type StackOutput = {
  OutputKey: string,
  OutputValue?: ?string,
  Description?: ?string,
  ExportName?: ?string,
}

export type StackDescription = {
  StackName: string,
  Outputs?: ?Array<StackOutput>,
}

export type DescribeStacksResponse = {
  Stacks: Array<StackDescription>,
}

export const DescribeStacksResponseType = (reify: Type<DescribeStacksResponse>)

export type InstanceDescription = {
  PrivateIpAddress?: ?string,
  PublicIpAddress?: ?string,
  State: {
    Code: number,
    Name: string,
  },
  StateTransitionReason?: ?string,
  SubnetId: string,
  VpcId: string,
}

export type ReservationDescription = {
  Instances?: Array<InstanceDescription>,
}

export type DescribeInstancesResponse = {
  Reservations: Array<ReservationDescription>,
}

export const DescribeInstancesResponseType = (reify: Type<DescribeInstancesResponse>)

export type LoadBalancerDescription = {
  LoadBalancerArn: string,
  DNSName: string,
  CanonicalHostedZoneId: string,
}

export type DescribeLoadBalancersResponse = {
  LoadBalancers: Array<LoadBalancerDescription>,
}

export const DescribeLoadBalancersResponseType = (reify: Type<DescribeLoadBalancersResponse>)
