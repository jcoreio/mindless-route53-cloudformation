#!/usr/bin/env node
// @flow

/* eslint-disable no-console */

import yargs from 'yargs'
import { upsertRecordSet } from 'mindless-route53'
import isDomainName from 'is-domain-name'
import inquirer from 'inquirer'
import { genRecordSetsForStack, confirmationMessage } from './index'

yargs
  .command(
    'upsert',
    'upsert a resource record set for a given stack',
    function(yargs: any) {
      yargs
        .usage(
          '$0 upsert <stack name> <domain name> --region <AWS region> [--ttl <time to live>]'
        )
        .option('ttl', {
          type: 'number',
          describe: 'the time-to-live for the record',
        })
        .option('c', {
          alias: 'comment',
          type: 'string',
          describe: 'a comment for the change',
        })
        .option('region', {
          type: 'string',
          describe: 'the AWS region',
        })
        .option('q', {
          alias: 'quiet',
          type: 'boolean',
          describe: 'suppress output',
        })
        .option('v', {
          alias: 'verbose',
          type: 'boolean',
          describe: 'enable verbose output',
        })
        .option('y', {
          alias: 'yes',
          type: 'boolean',
          describe: `don't ask for confirmation`,
        })
    },
    async function(argv: any) {
      const { ttl: TTL, comment: Comment, region, quiet, verbose, yes } = argv
      const args = argv._.slice(1)

      const StackName = args.find(
        arg => !isDomainName(arg) || arg.indexOf('.') < 0
      )
      const DNSName = args.find(
        arg => isDomainName(arg) && arg.indexOf('.') >= 0
      )

      if (!StackName || !DNSName) {
        console.log(
          `Usage: ${process.argv[0]} ${
            process.argv[1]
          } <stack name> <domain name>`
        )
        process.exit(1)
        return
      }

      const log = quiet ? () => {} : console.error.bind(console)

      const recordSets = await genRecordSetsForStack({
        StackName,
        DNSName,
        TTL,
        region,
        log,
        verbose,
      })

      if (!yes) {
        console.log(confirmationMessage({ StackName, recordSets }))
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
    }
  )
  .demandCommand()
  .version()
  .help()

yargs.argv
