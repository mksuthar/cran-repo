import { Stream, Transform, TransformCallback } from 'stream';
import { Parse as TarParser } from 'tar';
import { Result } from './common';
import { parse_description } from './description';

/**
 * Extracts a file from tarball into buffer.
 *
 * @param tarball readable stream of tarball file
 * @param filePath absolute filepath of file in tarball, which you want to extract
 * @returns {Buffer} of file from tarball stream.
 * 
 * Reference: https://github.com/npm/node-tar/issues/181
 */
export async function extract(tarball: NodeJS.ReadableStream, filePath: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        let success = false
        const parser = new TarParser({
            strict: true,
            filter: (currentPath: string) => {
                const isMatch = currentPath === filePath
                if (isMatch) {
                    success = true
                }
                return isMatch
            },
            onentry: (entry) => resolve(stream2buffer(entry))
        });
        tarball
            .pipe(parser)
            .on('end', () => {
                if (!success) {
                    reject(new Error(`Could not find file '${filePath}' in tarball.`))
                }
            })
    })
}

export class TranformDebianControlChunks extends Transform {
    previous = ''
    sep = '\n\n'

    constructor() {
        super({
            objectMode: true,
            readableObjectMode: true,
            writableObjectMode: true
        })
    }

    _transform(
        chunk: string,
        _encoding: BufferEncoding,
        callback: TransformCallback
    ): void {
        let start = this.previous.length
        this.previous += chunk

        // eslint-disable-next-line no-constant-condition
        while (true) {
            // Debian Control File's index seperate entry by \n\n, e.g.
            //
            // Package: A3
            // Version: 1.0.0
            // Depends: R (>= 2.15.0), xtable, pbapply
            // Suggests: randomForest, e1071
            // License: GPL (>= 2)
            // MD5sum: 027ebdd8affce8f0effaecfcd5f5ade2
            // NeedsCompilation: no
            //
            // Package: AATtools
            // Version: 0.0.2
            // Depends: R (>= 3.6.0)
            // Imports: magrittr, dplyr, doParallel, foreach
            // License: GPL-3
            // MD5sum: bc59207786e9bc49167fd7d8af246b1c
            // NeedsCompilation: no
            //
            // Package: ABACUS
            // and so on ,,,,
            const idx = this.previous.indexOf(this.sep, start)
            if (idx < 0) break

            const content = this.previous.slice(0, idx + this.sep.length)
            this.push(parse_description(content))
            this.previous = this.previous.slice(idx + this.sep.length)
            start = 0
        }
        callback()
    }
}

export async function filter<T, E>(
    stream: TranformDebianControlChunks,
    f: (parseResult: Result<T, E>) => boolean
): Promise<T[]> {
    const chunks: T[] = []

    return await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => {
            if (f(chunk)) {
                chunks.push(chunk.value)
            }
        })
        stream.on('error', (err: Error) => reject(err))
        stream.on('end', () => resolve(chunks))
    })
}

async function stream2buffer(stream: Stream): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = [];
        stream.on("data", chunk => raw.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(raw)));
        stream.on("error", err => reject(`Failed to convert stream: ${err}`));
    });
}