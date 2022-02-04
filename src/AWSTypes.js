// $FlowFixMe
// @flow

import * as t from 'typed-validators'

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

export const StackOutputType: t.TypeAlias<StackOutput> = t.alias(
  'StackOutput',
  t.object({
    exact: false,

    required: {
      OutputKey: t.string(),
    },

    optional: {
      OutputValue: t.nullishOr(t.string()),
      Description: t.nullishOr(t.string()),
      ExportName: t.nullishOr(t.string()),
    },
  })
)

export type StackDescription = {
  StackName: string,
  Outputs?: ?Array<StackOutput>,
}

export const StackDescriptionType: t.TypeAlias<StackDescription> = t.alias(
  'StackDescription',
  t.object({
    exact: false,

    required: {
      StackName: t.string(),
    },

    optional: {
      Outputs: t.nullishOr(t.array(t.ref(() => StackOutputType))),
    },
  })
)

export type DescribeStacksResponse = {
  Stacks: Array<StackDescription>,
}

// $FlowFixMe
export const DescribeStacksResponseType: t.TypeAlias<DescribeStacksResponse> =
  t.alias(
    'DescribeStacksResponse',
    t.object({
      exact: false,

      required: {
        Stacks: t.array(t.ref(() => StackDescriptionType)),
      },
    })
  )

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

export const InstanceDescriptionType: t.TypeAlias<InstanceDescription> =
  t.alias(
    'InstanceDescription',
    t.object({
      exact: false,

      required: {
        State: t.object({
          exact: false,

          required: {
            Code: t.number(),
            Name: t.string(),
          },
        }),

        SubnetId: t.string(),
        VpcId: t.string(),
      },

      optional: {
        PrivateIpAddress: t.nullishOr(t.string()),
        PublicIpAddress: t.nullishOr(t.string()),
        StateTransitionReason: t.nullishOr(t.string()),
      },
    })
  )

export type ReservationDescription = {
  Instances?: Array<InstanceDescription>,
}

export const ReservationDescriptionType: t.TypeAlias<ReservationDescription> =
  t.alias(
    'ReservationDescription',
    t.object({
      exact: false,

      optional: {
        Instances: t.array(t.ref(() => InstanceDescriptionType)),
      },
    })
  )

export type DescribeInstancesResponse = {
  Reservations: Array<ReservationDescription>,
}

export const DescribeInstancesResponseType: t.TypeAlias<DescribeInstancesResponse> =
  t.alias(
    'DescribeInstancesResponse',
    t.object({
      exact: false,

      required: {
        Reservations: t.array(t.ref(() => ReservationDescriptionType)),
      },
    })
  )

export type LoadBalancerDescription = {
  LoadBalancerArn: string,
  DNSName: string,
  CanonicalHostedZoneId: string,
}

export const LoadBalancerDescriptionType: t.TypeAlias<LoadBalancerDescription> =
  t.alias(
    'LoadBalancerDescription',
    t.object({
      exact: false,

      required: {
        LoadBalancerArn: t.string(),
        DNSName: t.string(),
        CanonicalHostedZoneId: t.string(),
      },
    })
  )

export type DescribeLoadBalancersResponse = {
  LoadBalancers: Array<LoadBalancerDescription>,
}

export const DescribeLoadBalancersResponseType: t.TypeAlias<DescribeLoadBalancersResponse> =
  t.alias(
    'DescribeLoadBalancersResponse',
    t.object({
      exact: false,

      required: {
        LoadBalancers: t.array(t.ref(() => LoadBalancerDescriptionType)),
      },
    })
  )
