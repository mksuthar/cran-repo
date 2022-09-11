# Cran Repository

Makes dealing with CRAN repository for package searches, and 
retrieval easy.

```js
import { CranLikeRepository } from './cran-repo';

const repo = new CranLikeRepository('https://not-valid-cran.org');

// Get Version
try {
  const geosphereVersions = repo.getLatestPackageVersion('geosphere');
  console.log(geosphereVersions[0].version); // 1.5-14
} catch (err) {
  console.log(err);
}

// Resolve Package
try {
  const geosphere = await r.resolvePackage('geosphere', '1.0.0');
  console.dir(geosphere, { depth: null });
} catch (err) {
  console.log(err);
}
```

## Cran Like Repository Format

For more detailed reference refer to: https://environments.rstudio.com/repositories.

```
/src/contrib
  package_0.1.0.tar.gz
  PACKAGES.rds
  PACKAGES.gz
  PACKAGES
    /PATH
      package_0.1.tar.gz
    /Archive/
      /package/
        package_0.1.tar.gz
/bin
  /windows/contrib
    /1.3
    /1.4
      /PACKAGES
      /package_1.0.zip
  /macosx/
    /contrib
      /1.3
      /1.4
        /PACKAGES
        /package_1.0.tgz
    /mavericks
    /leopard
    /el-capitan
```

Note, some Cran-like repositories by artifactory and nexus, may store source archive at:
```
- /src/contrib/package_1.0.tar.gz
- /src/contrib/Archive/package_1.0.tar.gz
- /src/contrib/Archive/package/package_1.0.tar.gz
- /src/contrib/Archive/package/1.0/package_1.0.tar.gz
```

### `PACKAGES` file

CRAN-like has metadata file called `PACKAGES`, which enumerates available 
packages in the repository. 

Content of this file looks like:

```text
Package: A3
Version: 1.0.0
Depends: R (>= 2.15.0), xtable, pbapply
Suggests: randomForest, e1071
License: GPL (>= 2)
MD5sum: 027ebdd8affce8f0effaecfcd5f5ade2
NeedsCompilation: no

Package: AATtools
Version: 0.0.2
Depends: R (>= 3.6.0)
Imports: magrittr, dplyr, doParallel, foreach
License: GPL-3
MD5sum: bc59207786e9bc49167fd7d8af246b1c
NeedsCompilation: no
```

### `PACKAGES.gz` file

This is compressed version of `PACKAGES` file.

### `package_0.9.tar.gz` file

This is source archive of package called `package` at version `0.9`. This tarball
will store `DESCRIPTION` file under: `package/DESCRIPTION` filepath.

This `DESCRIPTION` is required file for the R package, and must exist within source archive.


