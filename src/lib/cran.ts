import {
  parse_description,
  PackageDescription,
  ParseDescriptionMissingAttrError
} from './description'
import * as zlib from 'zlib'
import { Result } from './common'
import { RPackage } from './model'
import { extract, filter, TranformDebianControlChunks } from './utils'
import * as _ from 'lodash';
import any from 'promise.any';
import got from 'got'

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
    const pkgIndexURL = `src/contrib/PACKAGES`
    const pkgIndexGzURL = `src/contrib/PACKAGES.gz`
    const unzip = zlib.createUnzip()

    // Try to use compressed package index, if possible.
    let indexURL = pkgIndexGzURL
    try {
      await this.head(indexURL)
    } catch (e) {
      if (e instanceof got.HTTPError) {
        // This is likely non-200 error code, indicating gzip'd package
        // metadata does not exist
        indexURL = pkgIndexURL;
      } else {
        // `got`'s error must be caught into generic Error.
        // This is likely if host is not acessible, or other
        // non http status code related errors.
        throw new Error(`Cannot connect to: ${this.repoUrl}: ${e}`);
      }
    }

    const pkgsIndex = await this.stream(indexURL)
    const rawPkgIndexBody =
      indexURL === pkgIndexURL ? pkgsIndex : pkgsIndex.pipe(unzip)

    function isPackage(r: Result<PackageDescription, ParseDescriptionMissingAttrError>) {
      if (r.success) {
        return r.value.package === pkgName
      } else {
        return false
      }
    }

    // Although, in practice PACKAGES metadata will only keep latest version
    // It is possible to create CRAN like repository with multiple versions
    // (seperated by PATH attribute). In this case, return more than one entry
    // and let consumer decide, which one is "latest".
    // 
    // If no package name exist in the index, return empty array.
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

    // Some commerical repository (artifcatory, and nexus) use different
    // path scheme to store source archive. Try all possible path of source.
    const possibleUrls = [
      `src/contrib/Archive/${pkgName}/${pkgName}_${pkgVersion}.tar.gz`,
      `src/contrib/Archive/${pkgName}_${pkgVersion}.tar.gz`,
      `src/contrib/${pkgName}_${pkgVersion}.tar.gz`
    ]

    try {
      const rPackage = await any(possibleUrls.map(u => this.mkRPackage(pkgName, u)));
      return rPackage;
    } catch (err) {
      throw new Error(`Failed to get valid package source archive from: ${possibleUrls.join(", ")}. Valid pacakge source must have DESCRIPTION file.`)
    }
  }

  private async stream(url: string) {
    return got.stream(`${this.repoUrl}/${url}`, { headers: this.headers })
  }

  private async head(url: string) {
    return got.head(`${this.repoUrl}/${url}`, { headers: this.headers, throwHttpErrors: true });
  }

  private get headers() {
    let headers: Record<string, string> = {
      agent: this.agent,
    };
    if (this.user && this.pass) {
      headers = {
        ...headers,
        'Authorization': 'Basic ' + Buffer.from(this.user + ':' + this.pass).toString('base64')
      }
    }
    return headers;
  }

  private async mkRPackage(pkgName: string, url: string): Promise<RPackage> {
    try {
      await this.head(url); // Errors from `got` have to be handled
    } catch (e) {
      if (e instanceof got.HTTPError) {
        throw new Error(`Failed to retrieve: ${e.request.requestUrl}, code: ${e.code}, got: ${e.message}`);
      }
      throw new Error(`Failed to retrieve: ${this.repoUrl}/${url}, error: ${e}`);
    }

    const resp = await this.stream(url);
    const unGzip = zlib.createGunzip()
    const description = await extract(resp.pipe(unGzip), `${pkgName}/DESCRIPTION`)
    const pkg = parse_description(description.toString('utf-8'))
    if (!pkg.success) {
      throw new Error(`Could not parse DESCRIPTION file in source archive: ${this.repoUrl}/${url}`)
    }

    return {
      description: pkg.value,
      source_download_url: `${this.repoUrl}/${url}`,
    }
  }
}