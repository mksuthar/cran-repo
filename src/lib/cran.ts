import fetch from 'node-fetch'
import {
  parse_description,
  PackageDescription,
  ParseDescriptionMissingAttrError
} from './description'
import * as zlib from 'zlib'
import { Result } from './common'
import { RPackage } from './model'
import { extract, filter, TranformDebianControlChunks } from './utils'
import _ from 'lodash'

export const DEFAULT_CRAN_URL = 'https://cran.r-project.org'
export const DEFAULT_HTTP_AGENT = 'CranLikeRepository-agent'

export class CranLikeRepository {
  public readonly repoUrl: string
  public readonly agent: string
  private readonly user?: string
  private readonly pass?: string

  constructor(repoUrl: string, user?: string, pass?: string, agent?: string) {
    this.repoUrl = repoUrl
    this.user = user
    this.pass = pass
    if (!_.isUndefined(agent)) {
      this.agent = agent
    } else {
      this.agent = DEFAULT_HTTP_AGENT
    }
  }

  /**
   * Retrieves latest version of the package.
   *
   * This presumes the index always stores latest package version,
   * this is true for default cran repository, nexus, and many others.
   * In case where many version of the packages are found in
   * the index, length of returned package description would be greater than 1.
   *
   *
   * @throws if the package does not exist in the repository.
   *
   * @param pkgName Name of the package (case sensitive).
   * @returns {PackageDescription[]} List of package description with version.
   */
  async getLatestPackageVersion(pkgName: string): Promise<PackageDescription[]> {
    const pkgIndexURL = `${this.repoUrl}/src/contrib/PACKAGES`
    const pkgIndexGzURL = `${this.repoUrl}/src/contrib/PACKAGES.gz`
    const unzip = zlib.createUnzip()

    // Try to use compressed package index, if possible.
    // Sometimes `PACKAGES.gz` may not be present - e.g. JFrog Artifactory, etc.
    let indexURL = pkgIndexGzURL
    const hPkgIndexGzURL = await this.retrieve(indexURL, 'HEAD')
    if (!hPkgIndexGzURL.ok) {
      indexURL = pkgIndexURL
    }

    const pkgsIndex = await this.retrieve(indexURL)
    if (!pkgsIndex.ok) {
      throw new Error(`unexpected response: ${pkgsIndex.statusText} when trying to read package index: ${indexURL}`)
    }
    if (!pkgsIndex.body) {
      throw new Error(`expected body to be not null, for package index at: ${indexURL}`)
    }

    // Decompress if using gzip package index
    const rawPkgIndexBody =
      indexURL === pkgIndexURL ? pkgsIndex.body : pkgsIndex.body.pipe(unzip)

    function isPackage(r: Result<PackageDescription, ParseDescriptionMissingAttrError>) {
      if (r.success) {
        return r.value.package === pkgName
      } else {
        return false
      }
    }

    return await filter(
      rawPkgIndexBody.pipe(new TranformDebianControlChunks()),
      isPackage
    )
  }

  /**
   * Resolves package in the repository.
   *
   * @throws if cannot find source archive in the repository.
   * @throws if the source archive does not have "DESCRIPTION" file.
   *
   * @param pkgName Name of the package to retrieve (case sensitive)
   * @param pkgVersion Version of the package to reteieve
   * @returns {RPackage} R Package
   */
  async resolvePackage(pkgName: string, pkgVersion: string): Promise<RPackage> {
    const cranSrcUrl = `${this.repoUrl}/src/contrib/Archive/${pkgName}/${pkgName}_${pkgVersion}.tar.gz`
    const artifactorySrcURL = `${this.repoUrl}/src/contrib/Archive/${pkgName}_${pkgVersion}.tar.gz`
    const nexusSrcURL = `${this.repoUrl}/src/contrib/${pkgName}_${pkgVersion}.tar.gz`

    const getPackage = async (url: string) => await this.mkRPackage(pkgName, url)

    try {
      return await Promise.any([
        getPackage(cranSrcUrl),
        getPackage(artifactorySrcURL),
        getPackage(nexusSrcURL)
      ]);
    } catch (err) {
      throw new Error(`Failed to get package's source archive from: ${cranSrcUrl}, ${artifactorySrcURL}, ${nexusSrcURL}`)
    }
  }

  private async retrieve(url: string, method?: 'GET' | 'HEAD', headers?: Record<string, string>) {
    if (this.user && this.pass) {
      headers = {
        ...headers,
        Authorization: 'Basic ' + Buffer.from(this.user + ':' + this.pass).toString('base64'),
        Agent: this.agent
      }
    }
    return fetch(url, { method, headers })
  }

  private async mkRPackage(pkgName: string, url: string): Promise<RPackage> {
    const resp = await this.retrieve(url)
    if (!resp.ok) {
      throw new Error(`recieved: ${resp.statusText}, from ${url}`)
    }

    // Read description from source archive
    const unGzip = zlib.createGunzip()
    const description = await extract(resp.body.pipe(unGzip), `${pkgName}/DESCRIPTION`)
    const pkg = parse_description(description.toString('utf-8'))
    if (!pkg.success) {
      throw new Error(`recieved: ${resp.statusText}, from ${url}`)
    }

    return {
      description: pkg.value,
      source_download_url: url
    }
  }
}

//
