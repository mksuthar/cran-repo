import { describe, expect, test } from '@jest/globals'
import { CranLikeRepository } from './cran'

describe('CranLikeRepository', () => {
  describe('getLatestPackageVersion', () => {
    test('should return latest version', async () => {
      const r = new CranLikeRepository('https://cran.r-project.org')
      const result = await r.getLatestPackageVersion('geosphere')
      expect(result).toHaveLength(1)
      expect(result[0].version).toBe('1.5-14')
    });

    test('should not resolve for when provided invalid repository', async () => {
      const r = new CranLikeRepository('https://not-valid-cran.org');
      try {
        await r.getLatestPackageVersion('A3');
      } catch (err) {
        expect(err);
      }
    });

    test('should not find latest version for non-existent package', async () => {
      const r = new CranLikeRepository('https://cran.r-project.org');
      await expect(r.getLatestPackageVersion('not-valid')).resolves.toEqual([]);
    });
  });

  describe('resolvePackage', () => {
    test('should return r package', async () => {
      const r = new CranLikeRepository('https://cran.r-project.org')
      const result = await r.resolvePackage('geosphere', '1.0.0')
      expect(result.source_download_url).toBe('https://cran.r-project.org/src/contrib/Archive/geosphere/geosphere_1.0.0.tar.gz')
      expect(result.description.package).toBe('geosphere')
      expect(result.description.version).toBe('1.0.0')
    });

    test('should not resolve for non-existent package', async () => {
      const r = new CranLikeRepository('https://cran.r-project.org');
      await expect(r.resolvePackage('not-valid-package', '0.0.0')).rejects.toThrow('Failed to get package\'s source archive from');
    });

    test('should not resolve for non-existent package version', async () => {
      const r = new CranLikeRepository('https://cran.r-project.org');
      await expect(r.resolvePackage('A3', '99.99.99')).rejects.toThrow('Failed to get package\'s source archive from');
    });
  });

  test('should use provided agent', async () => {
    const r = new CranLikeRepository('https://cran.r-project.org', undefined, undefined, "some-agent");
    expect(r.agent).toBe("some-agent")
  });

  test('should use default agent, if not provided', async () => {
    const r = new CranLikeRepository('https://cran.r-project.org');
    expect(r.agent).toBe('CranLikeRepository-agent');
  })
})
