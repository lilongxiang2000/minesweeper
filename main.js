const elTimer = $('#timer img')
const elMinesCount = $('#mines_count img')
const elReplayBtn = $('#replay')[0]
const elGame = $('#game')[0]

let timer
let target = null
let topScore
if (localStorage.getItem('topScore')) {
  topScore = JSON.parse(localStorage.getItem('topScore'))
} else topScore = [[],[],[]]

/** 所有 Mines 类，记录其状态 */
let __map = []

/** 所有 mines el元素 */
let elMap = []

const config = {
  level: localStorage.getItem('level') || 0,
  minesCount: [10, 40, 99],
  allCount: [
    [9, 9],
    [16, 16],
    [16, 30]
  ],
}

const gameState = {
  isStart: false,
  isOver: false,
  isWin: false,
  gameTime: 0,
  minesCount: config.minesCount[config.level],
}

// 第一次加载就尝试读取配置
$(`#level option[value="${config.level}"]`).prop('selected', true)
// 取消默认行为 拖拽图片 默认行为
document.querySelector('#main').addEventListener('mousedown', e => {
  e.preventDefault()
})
// 取消浏览器右键菜单
window.oncontextmenu = function (e) {
  e.preventDefault();
}

$(elReplayBtn).mousedown(() => {
  elReplayBtn.src = 'images/face/smile-down.png'
}).mouseup(() => {
  elReplayBtn.src = 'images/face/smile.png'
  init()
}).mouseleave(() => {
  if (!gameState.isOver) {
    elReplayBtn.src = 'images/face/smile.png'
  }
})

// 更换游戏难度
$('#level').change(e => {
  localStorage.setItem('level', e.target.value)
  config.level = e.target.value
  console.log(`config.level => ${config.level}`)
  init()
})

$('#btn_top').click(() => {
  console.log(topScore[config.level])
  alert(`
    模式：${['初级', '中级', '高级'][config.level]}\n
    TOP1: ${topScore[config.level][0] || Infinity} s\n
    TOP2: ${topScore[config.level][1] || Infinity} s\n
    TOP3: ${topScore[config.level][2] || Infinity} s
  `)
})

function updateTop(level, time) {
  topScore[level].push(time)
  topScore[level].sort((a, b) => a - b)
  while (topScore[level].length > 3) {
    topScore[level].pop()
  }
  localStorage.setItem('topScore', JSON.stringify(topScore))
}

// 游戏入口
$(elGame).mousedown(e => {
  if (e.target.tagName === 'IMG' && !gameState.isOver) {
    target = e.target
    if (e.button === 0) {
      elReplayBtn.src = 'images/face/click.png'
    }
  }
}).mouseup(e => {
  if (!gameState.isOver) {
    elReplayBtn.src = 'images/face/smile.png'
  }
  if (e.target === target) {
    if (gameState.isStart == false) {
      gameState.isStart = true
      timer = setTimer()
    }
    if (e.button === 0) {
      check(target)
    } else if (e.button === 2) {
      marking(target)
      if (gameState.minesCount == 0) {
        gameOver()
      }
    }

  }
}).mouseleave(function () {
  if (!gameState.isOver) {
    elReplayBtn.src = 'images/face/smile.png'
  }
})

function timerShow(num) {
  num = num < 0 ? 0 : num
  num = num > 999 ? 999 : num
  num = num.toString().padStart(3, '0')

  elTimer[0].src = `images/number/${num[0]}.png`
  elTimer[1].src = `images/number/${num[1]}.png`
  elTimer[2].src = `images/number/${num[2]}.png`
}

function minesCountShow(num) {
  num = num < 0 ? 0 : num
  num = num > 999 ? 999 : num
  num = num.toString().padStart(3, '0')

  elMinesCount[0].src = `images/number/${num[0]}.png`
  elMinesCount[1].src = `images/number/${num[1]}.png`
  elMinesCount[2].src = `images/number/${num[2]}.png`
}

// 初始化游戏
function init() {
  clearInterval(timer)
  timerShow(0)
  minesCountShow(config.minesCount[config.level])

  // 初始化游戏状态
  for (let state in gameState) {
    gameState[state] = {
      isStart: false,
      isOver: false,
      isWin: false,
      gameTime: 0,
      minesCount: config.minesCount[config.level],
    }[state]
  }

  __map = createRandomMap()
  drawElMap(__map)
}

function createRandomMap() {
  let level = config.level,
    x = config.allCount[level][0],
    y = config.allCount[level][1],
    minesCount = config.minesCount[level]

  let map = []
  for (let i = 0; i < x * y; i++) {
    map[i] = new Mines(
      (i < minesCount) ? true : false,
    )
  }
  return arrayTo2DArray(shuffle(map), x, y)
}

// 一维数组转二维
function arrayTo2DArray(arr, x, y) {
  let newArr = []
  for (let i = 0; i < x; i++) {
    newArr[i] = []
    for (let j = 0; j < y; j++) {
      newArr[i][j] = arr[i * y + j]
    }
  }
  return newArr
}

function shuffle(arr) {
  let random, newArr = []
  while (arr.length) {
    random = Math.random() * arr.length >> 0
    newArr.push(arr[random])
    arr.splice(random, 1)
  }
  return newArr
}
class Mines {
  constructor(isMines) {
    this.isMines = isMines
    this.isOpen = false
    this.isFlag = false
    this.isSuspicious = false
  }
}

function drawElMap(map) {
  // Remove all child nodes of the set of matched elements from the DOM.
  $(elGame).empty()
  elMap = []

  for (let i = 0; i < map.length; i++) {
    let div = $(`<div class="d-flex justify-content-start"></div>`)
    for (let j = 0; j < map[i].length; j++) {
      $(div).append(
        $(`<img src='images/mines-state/close.png' id='mines_${i}-${j}'>`)
          .addClass('m-0 p-0')
      )
    }
    $(elGame).append(div)
    elMap.push([...$(`img[id*=mines_${i}]`)])
  }
}

function check(el) {
  let [x, y] = $(el).attr('id')
    .split('_')[1].split('-')
    .map(item => parseInt(item))

  if (__map[x][y].isOpen) return
  if (__map[x][y].isFlag || __map[x][y].isSuspicious) {
    console.log('已标记，不可打开')
    return
  }

  if (__map[x][y].isMines) {
    elReplayBtn.src = 'images/face/died.png'
    elMap[x][y].src = 'images/mines-state/died.png'
    gameOver()
  } else {
    openMines(x, y)
  }
}

/** 对 mines 标记
 * @param {*} el
 */
function marking(el) {
  let [x, y] = $(el).attr('id')
    .split('_')[1].split('-')
    .map(item => parseInt(item))

  if (__map[x][y].isOpen) {
    console.log('已打开，不可标记')
    return
  }

  if (!__map[x][y].isFlag && !__map[x][y].isSuspicious) {
    __map[x][y].isFlag = true
    minesCountShow(--gameState.minesCount)
    el.src = 'images/mines-state/flag.png'
    return
  }
  if (__map[x][y].isFlag) {
    __map[x][y].isFlag = false
    minesCountShow(++gameState.minesCount)
    __map[x][y].isSuspicious = true
    el.src = 'images/mines-state/suspicious.png'
    return
  }
  if (__map[x][y].isSuspicious) {
    __map[x][y].isSuspicious = false
    el.src = 'images/mines-state/close.png'
    return
  }
}

function setTimer() {
  return setInterval(() => {
    gameState.gameTime++
    timerShow(gameState.gameTime)
  }, 1000)
}

function gameOver() {
  clearInterval(timer)
  gameState.isOver = true
  gameState.isStart = false


  let win = true
  for (let i = 0; i < __map.length; i++) {
    for (let j = 0; j < __map[0].length; j++) {
      // 未标记的雷
      if (__map[i][j].isMines &&
        !__map[i][j].isFlag &&
        elMap[i][j] != target
      ) {
        elMap[i][j].src = 'images/mines-state/mines.png'
        win = false
      }
      // 标记错误
      if (!__map[i][j].isMines &&
        __map[i][j].isFlag &&
        elMap[i][j] != target
      ) {
        elMap[i][j].src = 'images/mines-state/flag-wrong.png'
        win = false
      }
    }
  }

  if (win) {
    gameState.isWin = win
    elReplayBtn.src = 'images/face/win.png'
    updateTop(config.level, gameState.gameTime)
  }
}

function openMines(i, j) {
  if (i < 0 || i >= __map.length ||
    j < 0 || j >= __map[0].length ||
    __map[i][j].isOpen
  ) return

  let count = getAroundMines(i, j)
  elMap[i][j].src = `images/mines-state/${count}.png`
  __map[i][j].isOpen = true

  if (count == 0) {
    for (let x = i - 1; x <= i + 1; x++) {
      for (let y = j - 1; y <= j + 1; y++) {
        openMines(x, y)
      }
    }
  }
}

function getAroundMines(i, j) {
  let count = 0

  if (__map[i - 1]?.[j]?.isMines) count++
  if (__map[i + 1]?.[j]?.isMines) count++
  if (__map[i]?.[j - 1]?.isMines) count++
  if (__map[i]?.[j + 1]?.isMines) count++
  if (__map[i - 1]?.[j - 1]?.isMines) count++
  if (__map[i + 1]?.[j - 1]?.isMines) count++
  if (__map[i - 1]?.[j + 1]?.isMines) count++
  if (__map[i + 1]?.[j + 1]?.isMines) count++

  return count
}


init()
