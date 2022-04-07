const express = require('express');
const app = express();
const http = require('http');
const socketIO = require('socket.io');
const server = http.Server(app);
const io = socketIO(server);
const port = 80;

app.use(express.static("public"));


//////global変数//////
const THICKNESS_LENGTH = 3;
const HEIGHT_LENGTH = 13;
const WIDTH_LENGTH = 19;

const SIZE_WALL = 220;

const OUTERWALL_NUM = 1;
const WALL_NUM = 2;
const BLOCK_NUM = 3;
const BOMB_NUM = 4;
const BOMB_KICKED_NUM = 5;
const BOMB_PUNCHED_NUM = 6;


const FLOOR = 20;
const FLOOR01_NUM = 21;
const FLOOR02_NUM = 22;
//アイテムは当たり判定がないため、条件式の便宜上マイナスで扱う。
const ITEM_SPEEDUP_NUM = -1;
const ITEM_BOMBUP_NUM = -2;
const ITEM_FIREUP_NUM = -3;
const ITEM_PUNCH = -4;
const ITEM_KICK = -5;
const ITEM_HOLD = -6;
const ITEM_NUM = 6;

const ITEM_RANDOM = 0.8;
const BLOCK_RANDOM = 0.9;

let FIELD = null;
let FIELD_BOMB = null;
let is_send_field = false;

let bombID = 0;

let fire_indexs = [];
let moving_bombs = {};

const explosionTime = 3000;
const explosionRemainTime = 800;
const tickInterval = Math.floor(1000 / 60);

let chrs = {};

const init_middle_minI = 3;
const init_middle_minJ = 5;

const CHRS_POSITIONS = [
    {
        x: SIZE_WALL, 
        y: 0, 
        z: -SIZE_WALL
    },
    {
        x: SIZE_WALL * (WIDTH_LENGTH - 2), 
        y: 0, 
        z: -SIZE_WALL * (HEIGHT_LENGTH - 2)
    },
    {
        x: SIZE_WALL,
        y: 0,
        z: -SIZE_WALL * (HEIGHT_LENGTH - 2)
    },
    {
        x: SIZE_WALL * (WIDTH_LENGTH - 2),
        y: 0,
        z: -SIZE_WALL
    },
    {
        x: SIZE_WALL * init_middle_minJ,
        y: 0,
        z: -SIZE_WALL * init_middle_minI
    },
    {
        x: SIZE_WALL * (WIDTH_LENGTH - init_middle_minJ - 1),
        y: 0,
        z: -SIZE_WALL * (HEIGHT_LENGTH - init_middle_minI - 1)
    },
    {
        x: SIZE_WALL * init_middle_minJ,
        y: 0,
        z: -SIZE_WALL * (HEIGHT_LENGTH - init_middle_minI - 1)
    },
    {
        x: SIZE_WALL * (WIDTH_LENGTH - init_middle_minJ - 1),
        y: 0,
        z: -SIZE_WALL * init_middle_minI
    }
];

let is_used_chrsPos = new Array(CHRS_POSITIONS.length).fill(false);

class Bomb {
    constructor (index, len) {
        this.index = index;
        this.indexs = [];
        this.item_indexs = [];
        this.fireLen = len;
        this.id = bombID++;
        this.objID = null;
        this.timeoutID = setTimeout(Bomb.explosion.bind(this), explosionTime);
        
        this.intervalID = null;

        set_field([this.index], BOMB_NUM);
    }

    static explosion() {
        //四捨五入する。
        this.index = get_round_index(this.index);
        clearTimeout(this.timeoutID);
        clearInterval(this.intervalID);

        let {h, i, j} = this.index;
        FIELD_BOMB[h][i][j] = 0;
        this.indexs.push(this.index);
    
        for (let w = -1; w <= 1; w+=2) {
            for (let n = 1; n <= this.fireLen; n++) {
                if (this.push_fireIndex(h, i + w*n, j)) break;
            }
            
            for (let n = 1; n <= this.fireLen; n++) {
                if (this.push_fireIndex(h, i, j + w*n)) break;
            }
        }

        this.push_fireIndex(h - 1, i, j);

        if (this.objID != null) {
            delete moving_bombs[this.objID];
        }
        
        set_field(this.indexs, 0);
        for (const iindex of this.item_indexs) {
            set_field(
                [iindex],
                -Math.floor(Math.random()*(ITEM_NUM) + 1)    
            );
        }

        io.emit("fire", this.indexs, this.objID);
        fire_indexs[this.id] = this.indexs;
        setTimeout(() => {
            delete fire_indexs[this.id];
        }, explosionRemainTime);
    }
    
    push_fireIndex(h, i, j) {
        if (h < 1 || i < 1 || j < 1 || h >= THICKNESS_LENGTH || i >= HEIGHT_LENGTH-1 || j >= WIDTH_LENGTH-1) { 
            //console.log(`範囲外です。-> h=${h}, i=${i}, j=${j}`);
            return true;
        }

        const num = FIELD[h][i][j];
        const bomb = FIELD_BOMB[h][i][j];

        if (num == WALL_NUM || num == OUTERWALL_NUM || num > FLOOR) {
            return true;

        } else if (num == BLOCK_NUM) {
            this.indexs.push(toIndex(h,i,j));
            if (Math.random() <= ITEM_RANDOM) {
                this.item_indexs.push(toIndex(h,i,j));
            } return true;
        
        } else if (bomb != 0) {
            Bomb.explosion.bind(bomb)();
            return false;
        
        } else { 
            this.indexs.push(toIndex(h,i,j));
            return false;
        }
    }

    update_index(rate, dir, times=0, distance=rate) {
        let time = distance/rate; //着地するまでの時間
        const {h, i, j} = this.index;
        const {x, y, z} = dir;
        if (times < time) {
            this.setIndex = toIndex(
                h + y*rate - (2*y*rate/time)*times, 
                i + -z*rate,
                j + x*rate
            );
            this.apply_loop();
        } else {
            return true;
        }
    }
    
    apply_loop() {
        let {h, i, j} = this.index;
        if (i < 0) i = HEIGHT_LENGTH-1;
        else if (i > HEIGHT_LENGTH-1) i = 0;
        if (j < 0) j = WIDTH_LENGTH-1;
        else if (j > WIDTH_LENGTH-1) j = 0;

        if (this.index.i != i || this.index.j != j) {
            this.setIndex = toIndex(h, i, j);
        }
    }

    set setTimeoutID(id) {
        this.timeoutID = id;
    }

    set setIntervalID(id) {
        this.intervalID = id;
    }

    set setIndex(index) {
        this.index = index;
    }

    set setObjID(id) {
        this.objID = id;
    }
}

class Player {
    //実際、サーバー間でやり取りするのでクラスとしては扱えない。
    constructor () {
        let chrPosIndex = Player.get_chrPos_index();

        this.posIndex = chrPosIndex;
        this.pos = CHRS_POSITIONS[chrPosIndex];
        this.status = "idle";
        this.dir = {x:0, y:0, z:0};
        this.angle = 0;
        this.speed = 400;
        this.fireLen = 2;
        this.bombNum = 2;
        this.can_punch = false;
        this.can_kick = false;
        this.can_hold = true;
    }

    static get_chrPos_index() {
        for (const i in is_used_chrsPos) {
            if (!is_used_chrsPos[i]) {
                is_used_chrsPos[i] = true;
                return i;
            }
        } return 0;
    }
}

function init_field() {
    FIELD = new Array(THICKNESS_LENGTH);
    for (let h = 0; h < THICKNESS_LENGTH; h++) {
        FIELD[h] = new Array(HEIGHT_LENGTH);       
        for(let i = 0; i < HEIGHT_LENGTH; i++){
            FIELD[h][i] = new Array(WIDTH_LENGTH).fill(0);
        }
    }

    FIELD_BOMB = new Array(THICKNESS_LENGTH);
    for (let h = 0; h < THICKNESS_LENGTH; h++) {
        FIELD_BOMB[h] = new Array(HEIGHT_LENGTH);       
        for(let i = 0; i < HEIGHT_LENGTH; i++){
            FIELD_BOMB[h][i] = new Array(WIDTH_LENGTH).fill(0);
        }
    }

    //とてつもなく見にくいので改善予定
    for (let h = 0; h < THICKNESS_LENGTH; h++) {
        for (let i = 0; i < HEIGHT_LENGTH; i++) {
            for (let j = 0; j < WIDTH_LENGTH; j++) {
                if (h == 0) { //床
                    if (i == 1 || j == 1 || i == HEIGHT_LENGTH-2 || j == WIDTH_LENGTH-2) {
                        FIELD[h][i][j] = FLOOR02_NUM;
                    } else {
                        FIELD[h][i][j] = FLOOR01_NUM;
                    }
                } else if (h==1) {
                    if (i == 0 || j == 0 || i == HEIGHT_LENGTH-1 || j == WIDTH_LENGTH-1) { //外壁
                        FIELD[h][i][j] = OUTERWALL_NUM;
                    } else if (i % 2 == 0 && j % 2 == 0) { //偶数インデックスを壁にする
                        FIELD[h][i][j] = WALL_NUM;
                    } else { //確率で壊れるブロックを配置する。
                        if ((2 < i && i < HEIGHT_LENGTH - 3) || 
                            (2 < j && j < WIDTH_LENGTH - 3)
                        ) {
                            if (!((i == init_middle_minI || i == init_middle_minI+1 || 
                                   i == HEIGHT_LENGTH - init_middle_minI-1 || 
                                   i == HEIGHT_LENGTH - init_middle_minI-2) && 
                                 (j == init_middle_minJ || j == init_middle_minJ+1 || 
                                  j == WIDTH_LENGTH - init_middle_minJ-1 ||
                                  j == WIDTH_LENGTH - init_middle_minJ-2)
                                  )
                            ){
                                if (Math.random() <= BLOCK_RANDOM) {
                                    FIELD[h][i][j] = BLOCK_NUM;
                                }
                            }
                        }
                    }
                }
            }        
        }   
    }    
}

function set_field(indexs, num) {
    for (const index of indexs) {
        FIELD[index.h][index.i][index.j] = num;
    }
    is_send_field = true;
}

function get_round_index(index) {
    let rindex = toIndex(
        Math.round(index.h),
        Math.round(index.i),
        Math.round(index.j)
    );

    if (rindex.h >= THICKNESS_LENGTH) {
        rindex.h = THICKNESS_LENGTH-1;
        console.log("index.h is over array");
    }

    return rindex
}

function get_is_equal(index1, index2) {
    return (
        index1.h == index2.h &&
        index1.i == index2.i &&
        index1.j == index2.j
    );
}

function toIndex(h, i ,j) {
    return {"h":h, "i":i, "j":j};
}

function check_exploze(index, bomb) {
    for (const bombID of Object.keys(fire_indexs)) {
        for (const findex of fire_indexs[bombID]) {
            if (get_is_equal(index, findex)) {
                Bomb.explosion.bind(bomb)();
            }
        }
    }
}

setInterval(() => {
    if (is_send_field) {
        io.emit("field", FIELD);
        is_send_field = false;
    }
}, tickInterval);

io.on("connection", (socket) => {
    chrs[socket.id] = new Player();

    socket.emit("set_value", 
        THICKNESS_LENGTH,
        HEIGHT_LENGTH,
        WIDTH_LENGTH
    );

    socket.on("start", () => {
        //まず動いている爆弾を爆発させる。
        for (const id of Object.keys(moving_bombs)) {
            Bomb.explosion.bind(moving_bombs[id])();
        }

        if (FIELD_BOMB != null) {
            //爆弾がおかれていたらそれらを爆発させリセットする
            for (let h = 0; h < THICKNESS_LENGTH; h++) {
                for (let i = 0; i < HEIGHT_LENGTH; i++) {
                    for (let j = 0; j < WIDTH_LENGTH; j++) {
                        let bomb = FIELD_BOMB[h][i][j];
                        if (bomb != 0) Bomb.explosion.bind(bomb)();
                    }
                }
            }
        }

        //リセットが押されたことを通知、このイベントでクライアント側からのデータの送信を止めてもらう
        io.emit("received-start");
        
        //フィールドの初期化
        init_field();
        
        setTimeout(() => {
            //キャラの初期化
            is_used_chrsPos.fill(false);
            for (const id of Object.keys(chrs)) {
                chrs[id] = new Player();
            }
            io.emit("init-info", chrs);      
            io.emit("field", FIELD);
        }, 800);
    });

    socket.on("chr-info", (chrInfo) => {
        chrs[socket.id] = chrInfo;
        io.emit("chrs-info-update", chrs);        
    });

    socket.on("got-item", (index) => {
        set_field([index], 0);
    });

    socket.on("bomb", (index) => {
        const {h,i,j} = index;
        FIELD_BOMB[h][i][j] = new Bomb(index, chrs[socket.id].fireLen);
    });

    socket.on("bomb-kick", (bindex, dir, id) => {
        const bomb = FIELD_BOMB[bindex.h][bindex.i][bindex.j];
        let intervalID = null;
        if (bomb == undefined) {
            //バグ回避。ボムキックが呼ばれ、ラグで爆発した後にこのイベントが呼ばれた場合に、undefindedになってサーバーが落ちる。
            console.log("already explozed");
        } else {
            set_field([bindex], BOMB_KICKED_NUM);
            intervalID = setInterval(move_bomb, tickInterval);
            bomb.setIntervalID = intervalID;
            bomb.setObjID = id;
            moving_bombs[id] = bomb;
        }

        const rate = 0.1;
        const {x, z} = dir;

        function move_bomb() {
            let is_stopped = false;
            bomb.update_index(rate, dir);
            const {h, i, j} = bomb.index;
            const {index} = bomb;
            let ceilIndex = toIndex(
                Math.ceil(h),
                Math.ceil(i),
                Math.ceil(j)
            )
            let florIndex = toIndex(
                Math.floor(h),
                Math.floor(i),
                Math.floor(j)
            );
            let rundIndex = get_round_index(index);

            if (-z < 0 || x < 0) {
                const {h, i, j} = florIndex;
                let num = FIELD[h][i][j];
                if (num > 0 && num != BOMB_KICKED_NUM) {
                    clearInterval(intervalID);
                    bomb.setIndex = ceilIndex;
                    is_stopped = true;
                    set_field([bomb.index], BOMB_NUM);
                }
            } else if (-z > 0 || x > 0) {
                const {h, i, j} = ceilIndex;
                let num = FIELD[h][i][j];
                if (num > 0 && num != BOMB_KICKED_NUM) {
                    clearInterval(intervalID);
                    bomb.setIndex = florIndex;
                    is_stopped = true;
                    set_field([bomb.index], BOMB_NUM);
                }
            }
            
            if (!get_is_equal(bindex, rundIndex)) {
                set_field([bindex], 0);
                FIELD_BOMB[bindex.h][bindex.i][bindex.j] = 0;
                bindex = rundIndex;
                set_field([bindex], BOMB_KICKED_NUM);
                FIELD_BOMB[bindex.h][bindex.i][bindex.j] = bomb;
                check_exploze(bindex, bomb);
            }
            io.emit("move-bomb", bindex, bomb.index, id, is_stopped, true);
        }
    });

    socket.on("bomb-stop", id => {        
        const bomb = moving_bombs[id];
        if (bomb != undefined) {
            clearInterval(bomb.intervalID);
            bomb.setIndex = get_round_index(bomb.index);
            set_field([bomb.index], BOMB_NUM);
            delete moving_bombs[id];
        }
        io.emit("stop-bomb", id);
    });

    socket.on("bomb-punch", (bindex, dir, id) => {
        let distance = 3;
        const {h, i, j} = bindex;
        const bomb = FIELD_BOMB[h][i][j];
        let intervalID = null;
        if (bomb == undefined) {
            //バグ回避。ボムパンチが呼ばれ、ラグで爆発した後にこのイベントが呼ばれた場合に、undefindedになってサーバーが落ちる。
            console.log("already explozed");
        } else {
            set_field([bindex], 0);
            FIELD_BOMB[h][i][j] = 0;
            intervalID = setInterval(move_bomb, tickInterval);
            bomb.setIntervalID = intervalID;
            bomb.setObjID = id;
            moving_bombs[id] = bomb;
        }
        dir.y = 2;
        let times = 0;
        const rate = 0.25; //とりあえず0.25以上にしておいて。
        
        function move_bomb() {
            let is_stopped = false;
            
            if (bomb.update_index(rate, dir, times++, distance)) {
                let index = get_round_index(bomb.index);
                let {h, i, j} = index;
                //もし地面になにも無ければ。。。
                if (FIELD[h][i][j] <= 0 && 
                    (FIELD[h - 1][i][j] <= 0 || FIELD[h - 1][i][j] == BLOCK_NUM)
                ) {
                    clearInterval(intervalID);
                    is_stopped = true;
                    //このクソなコードではbindex.h+1に着地する。そこの一個下を見て条件分岐
                    if (FIELD[h - 1][i][j] != BLOCK_NUM) {
                        index = toIndex(--h, i, j);
                        bomb.setIndex = index;
                    }
                    set_field([index], BOMB_PUNCHED_NUM);
                    FIELD_BOMB[h][i][j] = bomb;
                    check_exploze(index, bomb);
                //地面に物があったら引き続きupdate_indexを呼んでもらう
                } else {
                    times = 0;
                    distance = 1;
                    bomb.index.h = bindex.h;
                }
            }
            
            io.emit("move-bomb", bindex, bomb.index, id, is_stopped);
        }
    });

    socket.on("bomb-hold", (bindex) => {
        const {h, i, j} = bindex;
        const bomb = FIELD_BOMB[h][i][j];
        let intervalID = null;
        let id = socket.id;

        if (bomb == undefined) {
            //バグ回避。ボムパンチが呼ばれ、ラグで爆発した後にこのイベントが呼ばれた場合に、undefindedになってサーバーが落ちる。
            console.log("already explozed");
        } else {
            set_field([bindex], 0);
            FIELD_BOMB[h][i][j] = 0;
            intervalID = setInterval(move_bomb, tickInterval);
            bomb.setIntervalID = intervalID;
            bomb.setObjID = id;
            clearTimeout(bomb.timeoutID);
            moving_bombs[id] = bomb;
        }

        function move_bomb() {
            if (chrs[socket.id] == undefined) {
                console.log("error", 576);
                return 0;
            }
            const {pos, angle} = chrs[socket.id];
            const rate = 0.3; //ちょっと前に設置。
            let index = toIndex(
                pos.y/SIZE_WALL + 1.4, -pos.z/SIZE_WALL - Math.cos(angle)*rate, pos.x/SIZE_WALL + Math.sin(angle)*rate
            );
            bomb.setIndex = index;
            io.emit("move-bomb", bindex, bomb.index, id);
        }
    });

    //bomb-throwの時にsocket.idの要素を削除する。
    socket.on("bomb-throw", (dir, distance = 5) => {
        let intervalID = null;
        let id = socket.id;
        const bomb = moving_bombs[id];
        
        if (bomb == undefined) {
            //バグ回避。ボムパンチが呼ばれ、ラグで爆発した後にこのイベントが呼ばれた場合に、undefindedになってサーバーが落ちる。
            console.log("already explozed");
        } else {
            clearTimeout(bomb.intervalID);
            intervalID = setInterval(move_bomb, tickInterval);
            let timeoutID = setTimeout(Bomb.explosion.bind(bomb), explosionTime); //変えたいがちょっと難しい。
            bomb.setIntervalID = intervalID;
            bomb.setTimeoutID = timeoutID;
        }

        dir.y = 2;
        let times = 0;
        const rate = 0.25; //とりあえず0.25以上にしておいて。
        
        function move_bomb() {
            let is_stopped = false;
            
            if (bomb.update_index(rate, dir, times++, distance)) {
                let index = get_round_index(bomb.index);
                let {h, i, j} = index;
                //もし地面になにも無ければ。。。
                if (FIELD[h][i][j] <= 0 && 
                    (FIELD[h - 1][i][j] <= 0 || FIELD[h - 1][i][j] == BLOCK_NUM)
                ) {
                    clearInterval(intervalID);
                    is_stopped = true;
                    //このクソなコードではbindex.h+1に着地する。そこの一個下を見て条件分岐
                    if (FIELD[h - 1][i][j] != BLOCK_NUM) {
                        index = toIndex(--h, i, j);
                        bomb.setIndex = index;
                    }
                    set_field([index], BOMB_PUNCHED_NUM);
                    FIELD_BOMB[h][i][j] = bomb;
                    check_exploze(index, bomb);
                //地面に物があったら引き続きupdate_indexを呼んでもらう
                } else {
                    times = 0;
                    distance = 1;
                }
            }
            
            io.emit("move-bomb", null, bomb.index, id, is_stopped);
        }
    });

    socket.on("disconnect", () => {
        if (moving_bombs[socket.id] != undefined) {   
            Bomb.explosion.bind(moving_bombs[socket.id])();
        }

        is_used_chrsPos[chrs[socket.id].posIndex] = false;
        delete chrs[socket.id];
        io.emit("init-info", chrs);   
    });
});

server.listen(port, () => {
    console.log("started");
});

