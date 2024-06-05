import { createReadStream, writeFileSync } from 'fs'
import { SubtitleParser } from 'matroska-subtitles'

async function extractSubtitles(filePath: string) {
  return new Promise((resolve, reject) => {
    const parser = new SubtitleParser()
    const englishSubtitles: any[] = []
    const vietnameseSubtitles: any[] = []
    let trackInfo: any[] = []

    let vietnameseTrack = 0
    let englishTrack = 2

    parser.once('tracks', (tracks) => {
      trackInfo = tracks
      trackInfo.forEach((track) => {
        if (track.name === 'Forced') vietnameseTrack = track.number
        if (!track.language && !track.name) englishTrack = track.number
      })
      console.log('Found Vietnamese track:', vietnameseTrack)
      console.log('Found English track', englishTrack)
      console.log('\nExtracting subtitles...\n')
    })

    parser.on('subtitle', (subtitle, trackNumber) => {
      if (trackNumber === englishTrack) {
        englishSubtitles.push(subtitle)
        console.log('found english', englishSubtitles.length + 1)
      } else if (trackNumber === vietnameseTrack) {
        vietnameseSubtitles.push(subtitle)
        console.log('found Vietnamese', vietnameseSubtitles.length + 1)
      }
    })

    parser.on('error', (error) => {
      reject(error)
    })

    const stream = createReadStream(filePath)

    stream.on('close', () => {
      if (englishSubtitles.length && vietnameseSubtitles.length) {
        const mergedSubtitles = mergeSubtitles(
          englishSubtitles,
          vietnameseSubtitles
        )
        const directory = filePath.split('/').slice(0, -1).join('/')
        const filename = filePath
          .split('/')
          .at(-1)
          ?.split('.')
          .slice(0, -1)
          .join('.')
        writeFileSync(
          `${directory}/merged-subtitles-${filename}.srt`,
          convertToSRT(mergedSubtitles)
        )
        console.log('Subtitles extracted and merged successfully.')
        resolve(true)
      } else {
        console.log('Failed to extract subtitles.')
        reject()
      }
    })

    stream.pipe(parser)
  })
}

function convertToSRT(subtitles) {
  return subtitles
    .map(
      (sub, index) =>
        `${index + 1}\n${formatTime(sub.time)} --> ${formatTime(
          sub.time + sub.duration
        )}\n${sub.text}\n`
    )
    .join('\n')
}

function formatTime(ms) {
  const date = new Date(ms)
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0')
  return `${hours}:${minutes}:${seconds},${milliseconds}`
}

function mergeSubtitles(englishSubtitles, vietnameseSubtitles) {
  return [...englishSubtitles, ...vietnameseSubtitles].sort((a, b) => {
    return a.time < b.time ? -1 : 1
  })
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Please provide the path to the MKV file.')
    process.exit(1)
  }

  try {
    await extractSubtitles(filePath)
  } catch (error) {
    console.error(error)
  }
}

main()
