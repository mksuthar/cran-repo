import * as _ from "lodash";
import { Result } from "./common";

/**
 * Describes `DESCRIPTION` file of R Package.
 *
 * Fields: `title`, `description`, `authors`, `maintainer`, `licences` are mandatory,
 * in CRAN, but they are marked optional here for flexibility with other repositories.
 *
 * Reference: https://cran.r-project.org/doc/manuals/R-exts.html#The-DESCRIPTION-file
 */
export type PackageDescription = {
  /**
   * Case sensitive identifier of the package.
   *
   * @example allhomes
   */
  package: string;

  /**
   * Version of the package.
   *
   * @example 0.3.0
   */
  version: string;

  /**
   * Title of the package.
   *
   * @example ```Extract Past Sales Data from Allhomes.com.au```
   */
  title?: string;

  /**
   * Description of the package.
   *
   * @example ```
   *    Extract past sales data for specific suburb(s) and year(s) from the Australian property
   *    website <https://www.allhomes.com.au>. Allhomes data include the address and property details,
   *    date and price of the sale, block size and unimproved value of properties mainly in the ACT and NSW.```
   */
  description?: string;

  /**
   * Authors of the package.
   * @example `Maurits Evers [aut, cre]`
   */
  authors?: string;

  /**
   * Maintainers of the packages, followed by a valid (RFC 2822) email address
   * in angle brackets.
   *
   * @example `Maurits Evers <maurits.evers@gmail.com>`
   */
  maintainer?: string;

  /**
   * Licensing for a package which might be distributed.
   *
   * For more information refer to: https://cran.r-project.org/doc/manuals/R-exts.html#Licensing
   *
   * @example
   * [`GPL-2`]
   * [`LGPL (>= 2.0, < 3)`, `Mozilla Public License`]
   * [`GPL-2`, `file LICENCE`]
   * [`GPL (>= 2)`, `BSD_3_clause + file LICENSE`]
   * [`Artistic-2.0`, `AGPL-3 + file LICENSE`]
   */
  licences?: string[];

  /**
   * Url for more information. Typically homepage of the author or a page
   * where additional material describing the software can be found.
   *
   * @example [`https://mevers.github.io/allhomes/`]
   */
  urls?: string[];

  /**
   * Url where to report bugs for with this package.
   *
   * @example undefined
   */
  bugReport?: string;
};

export type ParseDescriptionMissingAttrError = { missing: string[] };

export function parse_description(
  content: string,
): Result<PackageDescription, ParseDescriptionMissingAttrError> {
  let i = 0;

  let curr_field = "";
  let curr_value = "";

  enum PARSER_TOKEN {
    FIELD,
    VALUE,
  }
  let status = PARSER_TOKEN.FIELD;
  const attrs: Record<string, string> = {};


  while (i < content.length) {
    switch (status) {
      case PARSER_TOKEN.FIELD:
        if (content[i] === ":") {
          status = PARSER_TOKEN.VALUE;
        } else {
          curr_field += content[i];
        }
        break;

      case PARSER_TOKEN.VALUE:
        if (content[i] === "\n" || content[i] === "\r\n") {
          if (i != content.length - 1 && content[i + 1] !== " ") {
            status = PARSER_TOKEN.FIELD;

            // flush token pair
            attrs[curr_field] = curr_value;
            curr_field = "";
            curr_value = "";
            break;
          }
        } else {
          curr_value += content[i];
        }
        break;

      default:
        break;
    }
    i += 1;
  }

  const missing: string[] = [];
  ["Package", "Version"].forEach((a) => {
    if (!_.has(attrs, a)) {
      missing.push(a);
    }
  });

  if (!_.isEmpty(missing)) {
    return {
      success: false,
      value: { missing },
    };
  }

  function withoutExtraSpaces(v: string | undefined): string | undefined {
    return v?.trim()?.replace(/  +/g, ' ')
  }

  return {
    success: true,
    value: {
      package: attrs["Package"].trim(),
      version: attrs["Version"].trim(),
      maintainer: attrs["Maintainer"]?.trim(),
      urls: attrs["URL"]?.split(",").map((i) => i.trim()),
      bugReport: attrs["BugReports"]?.trim(),

      // hack:
      // multi-line fields, remove unecessary " " spaces
      title: withoutExtraSpaces(attrs["Title"]),
      description: withoutExtraSpaces(attrs["Description"]),
      authors: withoutExtraSpaces(attrs["Author"]),
      licences: withoutExtraSpaces(attrs["License"])?.split("|").map((i) => i.trim()),
    },
  };
}
