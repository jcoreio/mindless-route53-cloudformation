#!/usr/bin/env node

/* eslint-disable no-console */
import yargs from 'yargs'
import { upsertRecordSet } from 'mindless-route53'
// @ts-expect-error no type defs
import isDomainName from 'is-domain-name'
import inquirer from 'inquirer'
import { genRecordSetsForStack, confirmationMessage } from './index'

void yargs
  .command({
    command: 'upsert',
    describe: 'upsert a resource record set for a given stack',
    builder: (yargs) =>
      yargs
        .usage(
          '$0 upsert <stack name> <domain name> --region <AWS region> [--ttl <time to live>]'
        )
        .option('private-only', {
          type: 'boolean',
          describe: 'only create private DNS records',
        })
        .option('ttl', {
          type: 'number',
          describe: 'the time-to-live for the record',
        })
        .option('comment', {
          alias: 'c',
          type: 'string',
          describe: 'a comment for the change',
        })
        .option('region', {
          type: 'string',
          describe: 'the AWS region',
        })
        .option('quiet', {
          alias: 'q',
          type: 'boolean',
          describe: 'suppress output',
        })
        .option('verbose', {
          alias: 'v',
          type: 'boolean',
          describe: 'enable verbose output',
        })
        .option('yes', {
          alias: 'y',
          type: 'boolean',
          describe: `don't ask for confirmation`,
        }),
    handler: async (argv) => {
      const {
        privateOnly,
        ttl: TTL,
        comment: Comment,
        region,
        quiet,
        verbose,
        yes,
      } = argv
      const args = argv._.slice(1)
      const StackName = args.find(
        (arg): arg is string =>
          typeof arg === 'string' &&
          (!isDomainName(arg) || arg.indexOf('.') < 0)
      )
      const DNSName = args.find(
        (arg): arg is string =>
          typeof arg === 'string' && isDomainName(arg) && arg.indexOf('.') >= 0
      )
      if (!StackName || !DNSName) {
        console.log(
          `Usage: ${process.argv[0]} ${process.argv[1]} <stack name> <domain name>`
        )
        process.exit(1)
        return
      }
      const log = quiet ? () => {} : console.error.bind(console)
      const recordSets = await genRecordSetsForStack({
        StackName,
        DNSName,
        privateOnly,
        TTL,
        region,
        log,
        verbose,
      })
      if (!yes) {
        console.log(
          confirmationMessage({
            StackName,
            recordSets,
          })
        )
        const { ok } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'ok',
            message: 'Do you want to upsert these records?',
          },
        ])
        if (!ok) return
      }
      await Promise.all(
        recordSets.map(({ ResourceRecordSet, PrivateZone }) =>
          upsertRecordSet({
            ResourceRecordSet,
            PrivateZone,
            Comment,
            log,
            verbose,
          })
        )
      )
    },
  })
  .demandCommand()
  .version()
  .help().argv
