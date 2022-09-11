import { PackageDescription } from './description'

export type RPackage = {
  /**
   * Package Description.
   */
  description: PackageDescription
  /**
   * Url where source code of the package can be retrieved.
   */
  source_download_url: string
}
