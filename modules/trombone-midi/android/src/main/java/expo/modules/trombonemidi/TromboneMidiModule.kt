package expo.modules.trombonemidi

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TromboneMidiModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TromboneMidi")

    Function("isAvailable") { false }

    Function("setEnabled") { _: Boolean -> false }

    Function("play") { _: List<Int>, _: List<Int> -> }

    Function("releaseHeldNotes") { }

    Function("setAdvertising") { _: Boolean -> }

    Function("restore") { }

    Function("appearance") {
      mapOf(
        "available" to false,
        "glyph" to "disabled",
        "statusLine" to "Off",
        "wantsAdvertising" to false
      )
    }
  }
}
