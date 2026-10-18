import ExpoModulesCore

public class TromboneMidiModule: Module {
  private let midi = MidiOut()
  private let bluetooth = BluetoothMidi()
  private var wired = false

  public func definition() -> ModuleDefinition {
    Name("TromboneMidi")
    Events("onChange")

    Function("isAvailable") { true }

    Function("setEnabled") { (enabled: Bool) -> Bool in
      self.wire()
      let opened = self.midi.setEnabled(enabled)
      self.bluetooth.setSessionActive(opened && enabled)
      return opened
    }

    Function("play") { (started: [Int], stopped: [Int]) in
      self.wire()
      self.midi.play(started: started, stopped: stopped)
    }

    Function("releaseHeldNotes") {
      self.midi.releaseHeldNotes()
    }

    Function("setAdvertising") { (wants: Bool) in
      self.wire()
      self.bluetooth.setWantsAdvertising(wants)
    }

    Function("restore") {
      self.wire()
      self.bluetooth.restore()
    }

    Function("appearance") { () -> [String: Any] in
      self.wire()
      return self.appearance()
    }
  }

  private func wire() {
    guard !wired else { return }
    wired = true
    midi.sendAuxiliary = { [weak self] bytes in
      self?.bluetooth.send(bytes)
    }
    bluetooth.onChange = { [weak self] in
      guard let self else { return }
      self.sendEvent("onChange", self.appearance())
    }
  }

  private func appearance() -> [String: Any] {
    let look = BluetoothAppearance(
      midiEnabled: midi.isEnabled,
      wantsAdvertising: bluetooth.wantsAdvertising,
      radio: bluetooth.radio,
      advertising: bluetooth.isAdvertising,
      connected: bluetooth.isConnected
    )
    return [
      "available": true,
      "glyph": glyphName(look.glyph),
      "statusLine": look.statusLine,
      "wantsAdvertising": bluetooth.wantsAdvertising,
    ]
  }
}

private func glyphName(_ glyph: BluetoothGlyphState) -> String {
  switch glyph {
  case .disabled: return "disabled"
  case .idle: return "idle"
  case .advertising: return "advertising"
  case .connected: return "connected"
  }
}
