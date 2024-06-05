import { createReadStream, writeFileSync, readFileSync } from 'fs'
import { SubtitleParser } from 'matroska-subtitles'
// import { SrtParser } from 'srt-parser-2'

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
      //   console.log('trackInfo', trackInfo)
      trackInfo.forEach((track) => {
        if (track.name === 'Forced') vietnameseTrack = track.number
        if (!track.language && !track.name) englishTrack = track.number
      })
      console.log('Found Vietnamese track:', vietnameseTrack)
      console.log('Found English track', englishTrack)

      console.log('\nExtracting subtitles...\n')
    })

    parser.on('subtitle', (subtitle, trackNumber) => {
      //   console.log('subtitles', subtitle, trackNumber)
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
        writeFileSync('english.srt', convertToSRT(englishSubtitles))
        writeFileSync('vietnamese.srt', convertToSRT(vietnameseSubtitles))
        console.log('Subtitles extracted successfully.')
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

// function mergeSubtitles() {
//   const englishSubFile = readFileSync('english.srt', 'utf-8')
//   const vietnameseSubFile = readFileSync('vietnamese.srt', 'utf-8')

//   const parser = new SrtParser()
//   const englishSubs = parser.fromSrt(englishSubFile)
//   const vietnameseSubs = parser.fromSrt(vietnameseSubFile)

//   const mergedSubs = [...englishSubs, ...vietnameseSubs].sort((a, b) => {
//     return a.startTime < b.startTime ? -1 : 1
//   })

//   const mergedSrt = parser.toSrt(mergedSubs)
//   writeFileSync('merged.srt', mergedSrt)

//   console.log('Subtitles merged successfully.')
// }

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Please provide the path to the MKV file.')
    process.exit(1)
  }

  try {
    await extractSubtitles(filePath)
    // mergeSubtitles()
  } catch (error) {
    console.error(error)
  }
}

main()
