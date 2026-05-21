Below is a CLI-friendly wireframe spec for a video poker UI based on the screenshots. It is formatted so another agent can implement it in a terminal UI framework like React Ink.

```txt
VIDEO POKER CLI WIREFRAME
Target layout: 120 columns x 36 rows minimum
Primary style: bright casino arcade UI, high contrast, blocky text
Background: blue
Primary text: yellow
Secondary text: white
Accent / selected: red
Disabled / inactive: dark gray
```

## 1. Full Screen Layout

```txt
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ VIDEO POKER                                                                                         [?] HELP [Q] QUIT │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                      │
│        ┌────────────────────────────────────────────────────────────────────────────────────────────────────┐        │
│        │ PAYTABLE                                                                                           │        │
│        │ ┌──────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐                  │        │
│        │ │ HAND                 │  BET 1   │  BET 2   │  BET 3   │  BET 4   │  BET 5   │                  │        │
│        │ ├──────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤                  │        │
│        │ │ ROYAL FLUSH          │  8000    │ 16000    │ 24000    │ 32000    │ 40000    │                  │        │
│        │ │ STRAIGHT FLUSH       │   500    │  1000    │  1500    │  2000    │  2500    │                  │        │
│        │ │ 4 OF A KIND          │   250    │   500    │   750    │  1000    │  1250    │                  │        │
│        │ │ FULL HOUSE           │    90    │   180    │   270    │   360    │   450    │                  │        │
│        │ │ FLUSH                │    50    │   100    │   150    │   200    │   250    │                  │        │
│        │ │ STRAIGHT             │    40    │    80    │   120    │   160    │   200    │                  │        │
│        │ │ 3 OF A KIND          │    30    │    60    │    90    │   120    │   150    │                  │        │
│        │ │ TWO PAIR             │    20    │    40    │    60    │    80    │   100    │                  │        │
│        │ │ JACKS OR BETTER      │    10    │    20    │    30    │    40    │    50    │                  │        │
│        │ └──────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘                  │        │
│        └────────────────────────────────────────────────────────────────────────────────────────────────────┘        │
│                                                                                                                      │
│                                             TWO PAIR                                                                  │
│                                                                                                                      │
│        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│        │              │   │     HELD     │   │     HELD     │   │     HELD     │   │     HELD     │                │
│        │ 3♠           │   │ Q♦           │   │ Q♣           │   │ A♥           │   │ A♠           │                │
│        │              │   │              │   │              │   │              │   │              │                │
│        │              │   │              │   │              │   │              │   │              │                │
│        │      ♠       │   │      ♦       │   │      ♣       │   │      ♥       │   │      ♠       │                │
│        │              │   │              │   │              │   │              │   │              │                │
│        │           3♠ │   │           Q♦ │   │           Q♣ │   │           A♥ │   │           A♠ │                │
│        └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘                │
│             [1]                [2]                [3]                [4]                [5]                         │
│                                                                                                                      │
│        WIN: 20.00                                   BET: 10.00                                  BALANCE: 3010.00    │
│                                                                                                                      │
│        [P] SEE PAYS     [O] OPTIONS     [S] SPEED >>>     [B] BET DOWN     [U] BET UP     [ENTER] PLAY AGAIN        │
│                                                                                                                      │
│        Game: Jacks or Better                                                                                         │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Primary Component Tree

```txt
App
└─ GameScreen
   ├─ HeaderBar
   │  ├─ Title
   │  └─ UtilityActions
   │     ├─ Help
   │     └─ Quit
   │
   ├─ Paytable
   │  ├─ PaytableHeader
   │  ├─ PaytableRows
   │  └─ ActiveBetColumnHighlight
   │
   ├─ ResultBanner
   │  └─ CurrentHandResult / Prompt
   │
   ├─ CardRow
   │  ├─ CardSlot 1
   │  ├─ CardSlot 2
   │  ├─ CardSlot 3
   │  ├─ CardSlot 4
   │  └─ CardSlot 5
   │
   ├─ StatusBar
   │  ├─ WinAmount
   │  ├─ BetAmount
   │  └─ BalanceAmount
   │
   ├─ ActionBar
   │  ├─ SeePaysButton
   │  ├─ OptionsButton
   │  ├─ SpeedButton
   │  ├─ BetDownButton
   │  ├─ BetUpButton
   │  └─ DealDrawPlayAgainButton
   │
   └─ Footer
      └─ GameVariantLabel
```

## 3. Card Wireframe

Each card should be rendered as a fixed-size box. Recommended size: `16 cols x 9 rows`.

```txt
┌──────────────┐
│     HELD     │
│ Q♦           │
│              │
│              │
│      ♦       │
│              │
│           Q♦ │
└──────────────┘
     [2]
```

### Card States

```txt
NORMAL CARD
┌──────────────┐
│              │
│ 10♣          │
│              │
│              │
│      ♣       │
│              │
│          10♣ │
└──────────────┘
     [1]


HELD CARD
┌──────────────┐
│     HELD     │
│ Q♦           │
│              │
│              │
│      ♦       │
│              │
│           Q♦ │
└──────────────┘
     [2]


FACE DOWN / BEFORE DEAL
┌──────────────┐
│░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░│
│░░░ VIDEO ░░░ │
│░░ POKER ░░░░ │
│░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░│
└──────────────┘
     [1]
```

## 4. Game States

### State A: Ready to Deal

```txt
ResultBanner:
"PLACE YOUR BET"

Cards:
All cards face down

Primary action:
[ENTER] DEAL

Allowed keys:
[U] Bet Up
[B] Bet Down
[P] See Pays
[O] Options
[S] Speed
[Q] Quit
```

### State B: Choose Holds

```txt
ResultBanner:
"CHOOSE CARDS TO HOLD"

Cards:
All cards face up
Held cards show HELD label

Primary action:
[ENTER] DRAW

Allowed keys:
[1] Toggle hold card 1
[2] Toggle hold card 2
[3] Toggle hold card 3
[4] Toggle hold card 4
[5] Toggle hold card 5
[ENTER] Draw
[P] See Pays
[O] Options
[Q] Quit
```

### State C: Result / Play Again

```txt
ResultBanner:
Winning hand name, for example:
"TWO PAIR"
"FLUSH"
"JACKS OR BETTER"
"NO WIN"

Cards:
Final hand face up
Held labels may remain or be removed

StatusBar:
WIN updates to payout amount

Primary action:
[ENTER] PLAY AGAIN
```

## 5. Paytable Wireframe

The paytable is the strongest visual anchor. It should remain visible during normal gameplay.

```txt
┌──────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ HAND                 │  BET 1   │  BET 2   │  BET 3   │  BET 4   │  BET 5   │
├──────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ ROYAL FLUSH          │  8000    │ 16000    │ 24000    │ 32000    │ 40000    │
│ STRAIGHT FLUSH       │   500    │  1000    │  1500    │  2000    │  2500    │
│ 4 OF A KIND          │   250    │   500    │   750    │  1000    │  1250    │
│ FULL HOUSE           │    90    │   180    │   270    │   360    │   450    │
│ FLUSH                │    50    │   100    │   150    │   200    │   250    │
│ STRAIGHT             │    40    │    80    │   120    │   160    │   200    │
│ 3 OF A KIND          │    30    │    60    │    90    │   120    │   150    │
│ TWO PAIR             │    20    │    40    │    60    │    80    │   100    │
│ JACKS OR BETTER      │    10    │    20    │    30    │    40    │    50    │
└──────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

### Active Bet Column

Highlight the currently selected bet column.

Example: selected bet is `BET 4`.

```txt
│ HAND                 │  BET 1   │  BET 2   │  BET 3   │ >BET 4<  │  BET 5   │
```

Recommended terminal styling:

```txt
Default paytable:
- Border: yellow
- Labels: yellow
- Values: yellow

Selected bet column:
- Background: red
- Text: yellow or white
```

## 6. Status Bar

```txt
WIN: 20.00                                   BET: 10.00                                  BALANCE: 3010.00
```

Rules:

```txt
WIN
- Left aligned
- Shows last payout
- Yellow label, white or yellow value

BET
- Center aligned
- Shows current wager amount
- Larger/bolder than other values if terminal supports it

BALANCE
- Right aligned
- Shows available credits or currency
```

## 7. Action Bar

```txt
[P] SEE PAYS     [O] OPTIONS     [S] SPEED >>>     [B] BET DOWN     [U] BET UP     [ENTER] DEAL
```

Button style:

```txt
┌──────────────┐
│ [P] SEE PAYS │
└──────────────┘
```

Compact terminal version:

```txt
[P] SEE PAYS  [O] OPTIONS  [S] SPEED >>>  [B] BET DOWN  [U] BET UP  [ENTER] DEAL
```

### Primary Button Text by State

```txt
Ready to deal:
[ENTER] DEAL

Choosing holds:
[ENTER] DRAW

Showing result:
[ENTER] PLAY AGAIN
```

## 8. Recommended Keyboard Map

```txt
1              Toggle hold card 1
2              Toggle hold card 2
3              Toggle hold card 3
4              Toggle hold card 4
5              Toggle hold card 5

Enter          Deal / Draw / Play Again
U              Bet up
B              Bet down
P              Show paytable / see pays
O              Options
S              Change speed
?              Help
Q              Quit
Esc            Back / close modal
```

## 9. Responsive Terminal Layout

### Large Terminal: 120+ Columns

Use full layout:

```txt
Header
Paytable
Result Banner
Five cards in one row
Win / Bet / Balance
Action buttons
Footer
```

### Medium Terminal: 90–119 Columns

Use compact paytable and cards:

```txt
- Keep five cards in one row.
- Reduce card width to 12–14 columns.
- Shorten action labels.
- Keep paytable visible.
```

Example compact action bar:

```txt
[P] Pays  [O] Opts  [S] Speed  [B] Bet-  [U] Bet+  [Enter] Draw
```

### Small Terminal: Under 90 Columns

Use stacked sections:

```txt
- Paytable becomes collapsible.
- Default to showing only the active payout column.
- Cards may wrap into two rows.
```

Small paytable mode:

```txt
┌──────────────────────┬──────────┐
│ HAND                 │  BET 4   │
├──────────────────────┼──────────┤
│ ROYAL FLUSH          │ 32000    │
│ STRAIGHT FLUSH       │  2000    │
│ 4 OF A KIND          │  1000    │
│ FULL HOUSE           │   360    │
│ FLUSH                │   200    │
│ STRAIGHT             │   160    │
│ 3 OF A KIND          │   120    │
│ TWO PAIR             │    80    │
│ JACKS OR BETTER      │    40    │
└──────────────────────┴──────────┘
```

## 10. Visual Priority

The terminal UI should emphasize elements in this order:

```txt
1. Current result / instruction banner
2. Cards
3. Bet / Win / Balance
4. Primary action button
5. Paytable
6. Secondary controls
```

## 11. Styling Tokens

```txt
theme = {
  screenBackground: "blue",
  tableBorder: "yellow",
  tableText: "yellow",
  activeColumnBackground: "red",
  activeColumnText: "yellow",

  cardBackground: "white",
  cardBorder: "white",
  cardTextBlack: "black",
  cardTextRed: "red",
  heldText: "yellow",

  resultText: "yellow",
  resultShadow: "red",

  buttonBackground: "yellow",
  buttonText: "black",
  disabledButtonBackground: "gray",
  disabledButtonText: "darkGray",

  statusLabel: "yellow",
  statusValue: "white"
}
```

## 12. Implementation Notes for CLI Agent

```txt
- Avoid relying on images for cards.
- Use text-rendered cards with suit glyphs.
- Support ASCII fallback for terminals without suit symbols:
  ♠ = S
  ♥ = H
  ♦ = D
  ♣ = C

- Keep all columns fixed-width to prevent layout shifting.
- The card row should not jump when HELD appears.
- Always reserve the HELD row even when a card is not held.
- ResultBanner should be centered and uppercase.
- The selected bet column should visibly stand out.
- Use Enter as the primary action across all states.
- Use keys 1–5 for card hold toggles because this maps naturally to the five cards.
```

## 13. Example Data Shape

```ts
type GameState = "ready" | "holding" | "result";

type Suit = "spades" | "hearts" | "diamonds" | "clubs";

type Card = {
  rank: "A" | "K" | "Q" | "J" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";
  suit: Suit;
  held: boolean;
  faceDown: boolean;
};

type PokerUIState = {
  gameState: GameState;
  variant: "Jacks or Better";
  cards: Card[];
  resultLabel: string | null;
  winAmount: number;
  betAmount: number;
  balanceAmount: number;
  selectedBetColumn: 1 | 2 | 3 | 4 | 5;
  speedLevel: 1 | 2 | 3;
};
```

## 14. Final Target Look

```txt
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ VIDEO POKER                                                                                         [?] HELP [Q] QUIT │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                      │
│                         ┌──────────────────────────────────────────────────────────────┐                             │
│                         │ PAYTABLE                                                     │                             │
│                         │ ROYAL FLUSH        8000  16000  24000 >32000< 40000          │                             │
│                         │ STRAIGHT FLUSH      500   1000   1500  >2000<  2500          │                             │
│                         │ 4 OF A KIND         250    500    750  >1000<  1250          │                             │
│                         │ FULL HOUSE           90    180    270   >360<   450          │                             │
│                         │ FLUSH                50    100    150   >200<   250          │                             │
│                         │ STRAIGHT             40     80    120   >160<   200          │                             │
│                         │ 3 OF A KIND          30     60     90   >120<   150          │                             │
│                         │ TWO PAIR             20     40     60    >80<   100          │                             │
│                         │ JACKS OR BETTER      10     20     30    >40<    50          │                             │
│                         └──────────────────────────────────────────────────────────────┘                             │
│                                                                                                                      │
│                                                     FLUSH                                                            │
│                                                                                                                      │
│        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│        │              │   │              │   │              │   │              │   │              │                │
│        │ A♠           │   │ 7♠           │   │ K♠           │   │ 9♠           │   │ 8♠           │                │
│        │              │   │              │   │              │   │              │   │              │                │
│        │      ♠       │   │      ♠       │   │      ♠       │   │      ♠       │   │      ♠       │                │
│        │              │   │              │   │              │   │              │   │              │                │
│        │           A♠ │   │           7♠ │   │           K♠ │   │           9♠ │   │           8♠ │                │
│        └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘                │
│             [1]                [2]                [3]                [4]                [5]                         │
│                                                                                                                      │
│        WIN: 100.00                                  BET: 20.00                                  BALANCE: 1000.00    │
│                                                                                                                      │
│        [P] SEE PAYS     [O] OPTIONS     [S] SPEED >>>     [B] BET DOWN     [U] BET UP     [ENTER] DEAL              │
│                                                                                                                      │
│        JACKS OR BETTER                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
