import type { NavOperations, ShortcutOptions } from '@slidev/types'

import { defineShortcutsSetup } from '@slidev/types'

export default defineShortcutsSetup(
  (nav: NavOperations, base: ShortcutOptions[]) => {
    return [
      ...base, // keep the existing shortcuts
      {
        key: 'home',
        fn: () => nav.goFirst(),
      },
      {
        key: 'end',
        fn: () => nav.goLast(),
      },
    ]
  }
)
