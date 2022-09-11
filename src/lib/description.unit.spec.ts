import * as fs from 'fs'
import { Ok } from './common'
import { describe, expect, test } from '@jest/globals'
import { PackageDescription, parse_description } from './description'

function getContent(fixture: string): string {
  const buffer = fs.readFileSync(`./test/fixtures/${fixture}`)
  return buffer.toString()
}

function mkOk(obj: PackageDescription): Ok<PackageDescription> {
  return {
    success: true,
    value: obj
  }
}

describe('parse_description', () => {
  test('should parse typical description: allhomes', () => {
    expect(parse_description(getContent('all_homes_0.3.0'))).toEqual(
      mkOk({
        package: 'allhomes',
        version: '0.3.0',
        title: 'Extract Past Sales Data from Allhomes.com.au',
        description: 'Extract past sales data for specific suburb(s) and year(s) from the Australian property website <https://www.allhomes.com.au>. Allhomes data include the address and property details, date and price of the sale, block size and unimproved value of properties mainly in the ACT and NSW.',
        authors: 'Maurits Evers [aut, cre]',
        urls: ['https://mevers.github.io/allhomes/'],
        licences: ['MIT + file LICENSE'],
        maintainer: 'Maurits Evers <maurits.evers@gmail.com>',
        bugReport: undefined
      })
    )
  })

  test('should parse short description: abc.data', () => {
    expect(parse_description(getContent('abc.data_1.0'))).toEqual(
      mkOk({
        package: 'abc.data',
        version: '1.0',
        licences: ['GPL (>= 3)']
      })
    )
  })

  test('should parse typical description: a3_0.9.2', () => {
    expect(parse_description(getContent('a3_0.9.2'))).toEqual(
      mkOk({
        package: 'A3',
        version: '0.9.2',
        licences: ['GPL (>= 2)'],
        title: `A3: Accurate, Adaptable, and Accessible Error Metrics for Predictive Models`,
        description: `This package supplies tools for tabulating and analyzing the results of predictive models. The methods employed are applicable to virtually any predictive model and make comparisons between different methodologies straightforward.`,
        maintainer: 'Scott Fortmann-Roe <scottfr@berkeley.edu>',
        authors: 'Scott Fortmann-Roe'
      })
    )
  })
})
