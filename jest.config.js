/* eslint-disable no-undef */
module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  rootDir: 'src',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  testEnvironment: 'node'
}
