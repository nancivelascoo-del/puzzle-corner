/* Puzzle Corner UI words. */
(function (G) {
  'use strict';
  var PC = G.PC = G.PC || {};
  PC.STR = {
    en: {
      greetMorning: 'Good morning!', greetAfternoon: 'Good afternoon!', greetEvening: 'Good evening!',
      homeSub: 'Pick a puzzle and take your time. Everything saves by itself.',
      language: 'Language', textSize: 'Text size', smaller: 'Smaller text', larger: 'Larger text',
      sound: 'Sound', on: 'On', off: 'Off', newShort: 'New',
      timerSetting: 'Timer', timerOn: 'Timer: On', timerOff: 'Timer: Off',
      daily: 'Puzzle of the Day', dailyPlay: "Play today's puzzle", dailyContinue: "Continue today's puzzle",
      dailyDone: 'Done for today! A new one arrives tomorrow.', dailyAgain: 'Look at it again',
      favorites: 'Your favorite themes', favSub: 'Word Search with these topics',
      games: 'Games', solvedN: 'Solved: {n}', inProgress: 'In progress', play: 'Play', cont: 'Continue',
      offlineNote: 'Works without internet after the first visit. No ads, no sign-in.',
      home: 'Home', easy: 'Easy', medium: 'Medium', hard: 'Hard', newPuzzle: 'New puzzle',
      howTo: 'How to play:', hint: 'Hint', reveal: 'Reveal', undo: 'Undo', erase: 'Erase', check: 'Check',
      theme: 'Theme', topic: 'Topic', anyTheme: 'Mixed themes', chooseTheme: 'Choose a theme', chooseTopic: 'Choose a topic',
      cancel: 'Cancel', close: 'Close', yesNew: 'Yes, start a new one',
      confirmNew: 'Start a new puzzle? The one you are working on will be replaced.',
      confirmReveal: 'Show all the answers? This will finish the puzzle.', yesReveal: 'Yes, show answers',
      wellDone: 'Wonderful!', solvedMsg: 'You finished the puzzle. Well done!',
      dailyDoneMsg: "You finished today's puzzle! Come back tomorrow for a new one.",
      revealedTitle: 'Here are the answers', revealedMsg: 'Try a new puzzle any time.',
      timeTaken: 'Time: {t}', backHome: 'Back to Home', seeBoard: 'Look at the puzzle',
      dailyTag: 'Puzzle of the Day', saved: 'Saved',
      // word search
      ws_name: 'Word Search', ws_desc: 'Find the hidden words',
      ws_how: 'Tap the first letter of a word, then tap its last letter. You can also slide your finger across the word.',
      ws_found: 'Found {a} of {b}', ws_words: 'Words to find',
      ws_notWord: "That's not one of the words. Try again!", ws_straight: 'Pick letters in a straight line.',
      ws_hintMsg: 'Look for "{w}". It starts at the glowing letter.', ws_tapLast: 'Good. Now tap the last letter.',
      ws_allFound: 'You found every word!',
      // crossword
      cw_name: 'Crossword', cw_desc: 'Fill in words from easy clues',
      cw_how: 'Tap a square, then type with the letter buttons. Tap the same square again to switch between Across and Down.',
      across: 'Across', down: 'Down', del: 'Delete', prevClue: 'Back', nextClue: 'Next',
      checkLetter: 'Check this letter', checkWord: 'Check this word', checkAll: 'Check the whole puzzle',
      revealLetter: 'Show this letter', revealWord: 'Show this word', revealAll: 'Show the whole puzzle',
      cw_allGood: 'Everything you filled in is correct!', cw_wrongN: '{n} letters need another look. They are marked in red.',
      cw_almost: 'Almost! A few squares are not right yet. Try Check.',
      kbScreen: 'Keyboard: Big letters', kbDevice: 'Keyboard: Device', topicMixed: 'Mixed', topicPlants: 'Plants & Succulents', topicHome: 'Cleaning & Home',
      // sudoku
      su_name: 'Sudoku', su_desc: 'Fill the grid with 1 to 9',
      su_how: 'Each row, each column, and each 3×3 box needs the numbers 1 to 9, once each. Tap a square, then tap a number.',
      notesOn: 'Notes: On', notesOff: 'Notes: Off', mistakesOn: 'Show mistakes: On', mistakesOff: 'Show mistakes: Off',
      su_pick: 'Tap a square first.', su_given: 'That number is part of the puzzle.',
      su_almost: "Almost! Some numbers don't fit yet. Try Check.", su_checkOk: 'So far, so good! No mistakes.', su_checkBad: '{n} numbers are not right. They are marked in red.',
      // scramble
      sc_name: 'Word Scramble', sc_short: 'Scramble', sc_desc: 'Put the mixed-up letters in order',
      sc_how: 'Tap the letters in the right order to spell the word. Tap a letter in your answer to send it back.',
      sc_wordN: 'Word {a} of {b}', sc_cat: 'Theme: {c}', sc_starts: 'It starts with "{l}".', sc_shuffle: 'Shuffle', sc_clear: 'Clear',
      sc_notQuite: 'Not quite. Try again!', sc_correct: 'Yes! {w}', sc_next: 'Next word', sc_show: 'Show word', sc_was: 'The word was {w}',
      // memory
      mm_name: 'Memory Match', mm_short: 'Memory', mm_desc: 'Find the matching picture pairs',
      mm_how: 'Tap two cards to turn them over. If the pictures match, they stay face up. Find all the pairs!',
      mm_pairs: 'Pairs found: {a} of {b}', mm_moves: 'Turns: {n}', mm_peek: 'Peek', mm_set: 'Pictures: {s}',
      settings: 'Settings', settingsTitle: 'Settings', difficulty: 'Difficulty', done: 'Done', gotIt: 'Got it', howShort: 'How to play', wordsToFind: 'Words to find'
    }
  };
  PC.DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  PC.MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
})(typeof window !== 'undefined' ? window : globalThis);
