import AVFoundation

enum KeyboardInstrument: String {
    case piano
    case trombone
}

/// File name used by the Fluid (R3) samples, such as `Db4` for C#4.
func sampleFileStem(midiNote: Int) -> String {
    let names = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
    let octave = (midiNote / 12) - 1
    return "\(names[midiNote % 12])\(octave)"
}

func noteChanges(from old: Set<Int>, to new: Set<Int>) -> (started: [Int], stopped: [Int]) {
    (started: new.subtracting(old).sorted(), stopped: old.subtracting(new).sorted())
}

struct TromboneSustain {
    var intro: [Float]
    var loop: [Float]
}

/// Attack once, then a slice of the steady middle. The loop ends on the same waveform phase it starts on, and that join is crossfaded.
func tromboneSustainLoop(samples: [Float], sampleRate: Double, midi: Int) -> TromboneSustain? {
    guard sampleRate > 0 else { return nil }
    let start = Int((0.80 * sampleRate).rounded())
    let fadeFloor = Int((0.04 * sampleRate).rounded())
    guard start > fadeFloor, samples.count > start + fadeFloor * 4 else { return nil }

    let period = tromboneFundamentalPeriod(samples: samples, sampleRate: sampleRate, midi: midi, at: start)
    let fadeCycles = max(2, Int((Double(fadeFloor) / Double(period)).rounded(.up)))
    let fade = fadeCycles * period
    let nominalEnd = min(Int((2.75 * sampleRate).rounded()), samples.count - period - 8)
    guard nominalEnd - start > fade * 3, nominalEnd + period < samples.count else { return nil }

    var end = nominalEnd
    var bestError = Float.greatestFiniteMagnitude
    let compare = min(period, samples.count - nominalEnd - period)
    guard compare > 8 else { return nil }
    for candidate in (nominalEnd - period)...(nominalEnd + period) {
        var error: Float = 0
        for index in 0..<compare {
            let delta = samples[candidate + index] - samples[start + index]
            error += delta * delta
        }
        if error < bestError {
            bestError = error
            end = candidate
        }
    }
    guard end - start > fade * 2, end + fade <= samples.count else { return nil }

    var loop = Array(samples[start..<end])
    let fadeStart = loop.count - fade
    guard fadeStart > 0 else { return nil }
    for index in 0..<fade {
        let amount = Float(index + 1) / Float(fade)
        let fadeOut = cos(amount * .pi / 2)
        let fadeIn = sin(amount * .pi / 2)
        loop[fadeStart + index] = samples[end - fade + index] * fadeOut + samples[start + index] * fadeIn
    }
    return TromboneSustain(intro: Array(samples[0..<start]), loop: loop)
}

func tromboneFundamentalPeriod(samples: [Float], sampleRate: Double, midi: Int, at start: Int) -> Int {
    let frequency = 440.0 * pow(2.0, Double(midi - 69) / 12.0)
    let guess = max(8, Int((sampleRate / frequency).rounded()))
    let window = min(Int(0.05 * sampleRate), samples.count - start - guess - 2)
    guard window > guess * 2 else { return guess }
    let minLag = max(8, Int(Double(guess) * 0.98))
    let maxLag = min(window - 1, Int((Double(guess) * 1.02).rounded(.up)))
    guard maxLag > minLag else { return guess }
    var bestLag = guess
    var bestScore: Float = -.greatestFiniteMagnitude
    for lag in minLag...maxLag {
        var score: Float = 0
        var index = 0
        while index < window - lag {
            score += samples[start + index] * samples[start + index + lag]
            index += 2
        }
        if score > bestScore {
            bestScore = score
            bestLag = lag
        }
    }
    return bestLag
}

/// Polyphonic sampler. Each pressed key gets its own voice, so chords sound together.
final class PianoAudio {
    private let engine = AVAudioEngine()
    private let format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
    private let voiceCount = 32
    private var players: [AVAudioPlayerNode] = []
    private var voiceNote: [Int?] = []
    private var voiceGeneration: [Int] = []
    private var voiceAge: [Int] = []
    private var fading: Set<Int> = []
    private var generation = 0
    private struct SampleVoice {
        var playedOnce: AVAudioPCMBuffer
        var loop: AVAudioPCMBuffer?
    }

    private var buffers: [KeyboardInstrument: [Int: SampleVoice]] = [:]
    private let bufferLock = NSLock()
    private let loadQueue = DispatchQueue(label: "trombone-piano.samples", qos: .userInitiated)
    private var interruptionObserver: NSObjectProtocol?
    private var started = false

    private(set) var instrument: KeyboardInstrument = .trombone
    private var sounding: Set<Int> = []

    func start(instrument: KeyboardInstrument) {
        self.instrument = instrument
        guard !started else {
            preload(instrument)
            return
        }
        started = true
        configureSession()
        installVoices()
        engine.prepare()
        do {
            try engine.start()
        } catch {
            return
        }
        for player in players {
            player.play()
        }
        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance(),
            queue: .main
        ) { [weak self] notification in
            self?.handleInterruption(notification)
        }
        preload(instrument)
        preload(instrument == .piano ? .trombone : .piano)
    }

    func setInstrument(_ instrument: KeyboardInstrument) {
        guard instrument != self.instrument else { return }
        self.instrument = instrument
        let held = sounding
        silenceVoices()
        for note in held.sorted() {
            play(note)
        }
    }

    func setSounding(_ notes: Set<Int>) {
        let changes = noteChanges(from: sounding, to: notes)
        sounding = notes
        for note in changes.stopped {
            release(note)
        }
        for note in changes.started {
            play(note)
        }
    }

    func resumeIfNeeded() {
        guard started, !engine.isRunning else { return }
        try? AVAudioSession.sharedInstance().setActive(true)
        try? engine.start()
        for player in players where !player.isPlaying {
            player.play()
        }
    }

    deinit {
        if let interruptionObserver {
            NotificationCenter.default.removeObserver(interruptionObserver)
        }
        engine.stop()
    }

    private func configureSession() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .default)
        try? session.setActive(true)
    }

    private func installVoices() {
        for _ in 0..<voiceCount {
            let player = AVAudioPlayerNode()
            player.volume = 0.7
            engine.attach(player)
            engine.connect(player, to: engine.mainMixerNode, format: format)
            players.append(player)
            voiceNote.append(nil)
            voiceGeneration.append(0)
            voiceAge.append(0)
        }
    }

    private func preload(_ instrument: KeyboardInstrument) {
        loadQueue.async { [weak self] in
            guard let self else { return }
            for midi in lowestMidiNote...highestMidiNote {
                _ = self.cachedSample(instrument: instrument, midi: midi)
            }
        }
    }

    private func play(_ note: Int) {
        guard engine.isRunning else { return }
        let index = voiceIndex(for: note)
        generation += 1
        let token = generation
        voiceGeneration[index] = token
        voiceNote[index] = note
        voiceAge[index] = token
        fading.remove(index)
        let player = players[index]
        player.volume = 0.7
        player.stop()
        guard let sample = cachedSample(instrument: instrument, midi: note) else {
            voiceNote[index] = nil
            player.play()
            return
        }
        player.scheduleBuffer(sample.playedOnce, at: nil, options: [])
        if let loop = sample.loop {
            player.scheduleBuffer(loop, at: nil, options: .loops)
        }
        player.play()
    }

    private func release(_ note: Int) {
        guard let index = voiceNote.firstIndex(of: note) else { return }
        let token = voiceGeneration[index]
        voiceNote[index] = nil
        fading.insert(index)
        let player = players[index]
        let steps = 6
        for step in 1...steps {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.015 * Double(step)) { [weak self] in
                guard let self, self.voiceGeneration[index] == token else { return }
                player.volume = 0.7 * Float(steps - step) / Float(steps)
                if step == steps {
                    player.stop()
                    player.volume = 0.7
                    player.play()
                    self.fading.remove(index)
                }
            }
        }
    }

    private func silenceVoices() {
        generation += 1
        let token = generation
        for index in players.indices {
            voiceGeneration[index] = token
            voiceNote[index] = nil
            fading.remove(index)
            players[index].stop()
            players[index].volume = 0.7
            players[index].play()
        }
    }

    private func voiceIndex(for note: Int) -> Int {
        if let index = voiceNote.firstIndex(of: note) {
            return index
        }
        if let index = voiceNote.indices.first(where: { voiceNote[$0] == nil && !fading.contains($0) }) {
            return index
        }
        if let index = voiceNote.indices.first(where: { voiceNote[$0] == nil }) {
            return index
        }
        return voiceAge.enumerated().min { $0.element < $1.element }?.offset ?? 0
    }

    private func cachedSample(instrument: KeyboardInstrument, midi: Int) -> SampleVoice? {
        bufferLock.lock()
        if let existing = buffers[instrument]?[midi] {
            bufferLock.unlock()
            return existing
        }
        bufferLock.unlock()
        guard let decoded = decode(instrument: instrument, midi: midi) else { return nil }
        let prepared = prepare(decoded, instrument: instrument, midi: midi)
        bufferLock.lock()
        if buffers[instrument] == nil {
            buffers[instrument] = [:]
        }
        if let existing = buffers[instrument]?[midi] {
            bufferLock.unlock()
            return existing
        }
        buffers[instrument]?[midi] = prepared
        bufferLock.unlock()
        return prepared
    }

    private func prepare(_ buffer: AVAudioPCMBuffer, instrument: KeyboardInstrument, midi: Int) -> SampleVoice {
        guard instrument == .trombone,
              let channel = buffer.floatChannelData,
              let sustain = tromboneSustainLoop(
                samples: Array(UnsafeBufferPointer(start: channel[0], count: Int(buffer.frameLength))),
                sampleRate: buffer.format.sampleRate,
                midi: midi
              ),
              let intro = pcmBuffer(sustain.intro, format: format),
              let loop = pcmBuffer(sustain.loop, format: format) else {
            return SampleVoice(playedOnce: buffer, loop: nil)
        }
        return SampleVoice(playedOnce: intro, loop: loop)
    }

    private func pcmBuffer(_ samples: [Float], format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let frames = AVAudioFrameCount(samples.count)
        guard frames > 0,
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames),
              let channel = buffer.floatChannelData else { return nil }
        buffer.frameLength = frames
        samples.withUnsafeBufferPointer { source in
            guard let base = source.baseAddress else { return }
            channel[0].update(from: base, count: samples.count)
        }
        return buffer
    }

    private func decode(instrument: KeyboardInstrument, midi: Int) -> AVAudioPCMBuffer? {
        let prefix = instrument == .piano ? "piano" : "trombone"
        guard let url = Bundle.main.url(
            forResource: "\(prefix)-\(sampleFileStem(midiNote: midi))",
            withExtension: "mp3"
        ) else { return nil }
        guard let file = try? AVAudioFile(forReading: url) else { return nil }
        guard let source = AVAudioPCMBuffer(
            pcmFormat: file.processingFormat,
            frameCapacity: AVAudioFrameCount(file.length)
        ) else { return nil }
        do {
            try file.read(into: source)
        } catch {
            return nil
        }
        guard let converter = AVAudioConverter(from: source.format, to: format) else { return nil }
        let ratio = format.sampleRate / source.format.sampleRate
        let capacity = AVAudioFrameCount((Double(source.frameLength) * ratio).rounded(.up)) + 32
        guard let converted = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else { return nil }
        var supplied = false
        var error: NSError?
        let input: AVAudioConverterInputBlock = { _, status in
            if supplied {
                status.pointee = .noDataNow
                return nil
            }
            supplied = true
            status.pointee = .haveData
            return source
        }
        converter.convert(to: converted, error: &error, withInputFrom: input)
        if error != nil || converted.frameLength == 0 {
            return nil
        }
        return converted
    }

    private func handleInterruption(_ notification: Notification) {
        guard let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .began {
            silenceVoices()
            sounding = []
        } else if type == .ended {
            resumeIfNeeded()
        }
    }
}
