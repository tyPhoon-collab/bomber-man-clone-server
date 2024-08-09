// const ENTRYPOINT = "http://localhost:8080";
const ENTRYPOINT = "https://bomber-man-pw7szx6oxa-an.a.run.app";

const socket = io(ENTRYPOINT);

//ここらへんごちゃごちゃなので後でなおす。
//やりたいことは、クライアントとサーバーで共通する変数は、片方変えるだけでいいようにすること
const SIZE_WALL = 220;
const SIZE_CHR = 200;

let THICKNESS_LENGTH = 0;
let HEIGHT_LENGTH = 0;
let WIDTH_LENGTH = 0;

let FIELD = 0;
let FIELD_NUM = 0;

const cameraMinDistance = 3000;
let cameraDistance = cameraMinDistance;
const cameraAngleX = Math.PI * 5 / 12;
let cameraPosX = 0;
let cameraPosY = 0;
let cameraPosZ = 0;

let renderer = null;
let camera = null;
let context = null;

//キーボードが押されているかどうかが格納されている配列。
let is_keyon = new Array(256).fill(false);

const BOMBNUM_MAX = 8;
const FIRELEN_MAX = 8;
const SPEED_MAX = 800;

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

const KEY_CODE = {
    "a": 65,
    "d": 68,
    "h": 72,
    "j": 74,
    "k": 75,
    "l": 76,
    "r": 82,
    "s": 83,
    "w": 87,
    "SPACE": 32,
};

const dirLightIntensity = 0.9;
const explosionTime = 3000;
const explosionRemainTime = 800;
const stanTime = 1000;
const easing_num = 0.02;
let bgm_vol = 0.8;

let statsDisplay = null;

let can_move = false;
let got_init = false;
let got_item = false;

let myChrInfo = null;

let placed_bombNum = 0;

let startBut = null;
let bgmChk = null;
let seChk = null;
let volSld = null;

const scene = new THREE.Scene();
const clock = new THREE.Clock();
const loader = new THREE.FBXLoader();
const audioLoader = new THREE.AudioLoader();
const listener = new THREE.AudioListener();

let WALL, OUTERWALL, BLOCK, BOMB, GROUND, FIRE
let FLOOR01, FLOOR02;
let CHR;
let SPEEDUP, BOMBUP, FIREUP, PUNCH, KICK, HOLD;
let ITEMs = [];
let FIRE_EFFECT, DEAD_EFFECT, ITEM_EFFECT;
let FIRE_SE, ITEM_SE, DEAD_SE;
let SEs = [];
let BGM01 = null;

let fire_indexs = [];
let moving_bombs = {};
let kicking_bomb_ids = [];
let chrsObj = {};
let chrsInfo = {};
let animMixers = {};
let animActs = {};
let is_alive = {};

const chrLength = 8;

const aliveMessage = "読み込み終了しました。'wasd'で移動、スペースで爆弾配置、爆弾に体当たりしながら'k'でボムキック、'l'でボムキックを停止、'j'で3マス先にボムパンチ、'h'でボムを持ち、持った状態でスペースで5マス先に投げる";
const deadMessage = "死んでしまいました。スペースで爆弾をフィールドに投げることができます。"

socket.on("set_value", (tl, hl, wl) => {
    THICKNESS_LENGTH = tl;
    HEIGHT_LENGTH = hl;
    WIDTH_LENGTH = wl;

    FIELD = new Array(THICKNESS_LENGTH);
    for (let h = 0; h < THICKNESS_LENGTH; h++) {
        FIELD[h] = new Array(HEIGHT_LENGTH);
        for (let i = 0; i < HEIGHT_LENGTH; i++) {
            FIELD[h][i] = new Array(WIDTH_LENGTH).fill(0);
        }
    }

    FIELD_NUM = new Array(THICKNESS_LENGTH);
    for (let h = 0; h < THICKNESS_LENGTH; h++) {
        FIELD_NUM[h] = new Array(HEIGHT_LENGTH);
        for (let i = 0; i < HEIGHT_LENGTH; i++) {
            FIELD_NUM[h][i] = new Array(WIDTH_LENGTH).fill(0);
        }
    }

    cameraPosX = Math.floor(WIDTH_LENGTH / 2) * SIZE_WALL;
    set_cameraPos();
});

//DOMをloadし終えたらinit関数を呼び出す。
window.addEventListener("DOMContentLoaded", loadObjs);
//ウィンドウのサイズ変更
window.addEventListener("resize", onResize);
//キー受け付け。keypressは非推奨らしい。
window.addEventListener("keydown", keydown);
window.addEventListener("keyup", keyup);

function onResize() {
    if (renderer != null) {
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
    } else {
        console.log("renderer is null");
    }

    if (camera != null) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    } else {
        console.log("renderer is null");
    }
}

function loadObj(path) {
    return new Promise(resolve => {
        loader.load(path, fbx => {
            fbx.traverse((node) => node.castShadow = node.receiveShadow = true);
            resolve(fbx);
        });
    });
}

async function loadObjs() {
    WALL = await loadObj("assets/objs_ver1.0/wall1.fbx");
    OUTERWALL = await loadObj("assets/objs_ver1.0/outerWall.fbx");
    BLOCK = await loadObj("assets/objs_ver1.0/block.fbx");
    BOMB = await loadObj("assets/objs_ver1.0/bomb2.fbx");
    GROUND = await loadObj("assets/objs_ver1.0/ground1.fbx");
    FIRE = await loadObj("assets/objs_ver1.0/fire.fbx");
    FLOOR01 = await loadObj("assets/objs_ver1.0/floor03.fbx");
    FLOOR02 = await loadObj("assets/objs_ver1.0/floor02.fbx");
    CHR = await loadObj("assets/objs_ver1.0/01-2.fbx");

    //items
    SPEEDUP = await loadObj("assets/objs_ver1.0/speedUp.fbx");
    BOMBUP = await loadObj("assets/objs_ver1.0/bombUp.fbx");
    FIREUP = await loadObj("assets/objs_ver1.0/fireUp.fbx");
    PUNCH = await loadObj("assets/objs_ver1.0/punch.fbx");
    KICK = await loadObj("assets/objs_ver1.0/kick.fbx");
    HOLD = await loadObj("assets/objs_ver1.0/hold.fbx");

    ITEMs = [HOLD, KICK, PUNCH, FIREUP, BOMBUP, SPEEDUP];

    //config shininess
    OUTERWALL.children[0].material.shininess = 8;
    BOMB.children[1].material.shininess = 8;
    GROUND.children[0].material.shininess = 2;

    loadAudios();
}

function loadAudio(path, vol, is_loop) {
    return new Promise(resolve => {
        let SE = new THREE.Audio(listener);
        audioLoader.load(path, (buf) => {
            SE.setBuffer(buf);
            SE.setVolume(vol);
            SE.setLoop(is_loop);
            resolve(SE);
        });
    });
}

async function loadAudios() {
    FIRE_SE = await loadAudio("assets/SE/爆発3.mp3", 0.5, false);
    ITEM_SE = await loadAudio("assets/SE/パワーアップ.mp3", 0.5, false);
    DEAD_SE = await loadAudio("assets/SE/K.O..mp3", 0.5, false);
    BGM01 = await loadAudio("assets/BGM/BGM02.mp3", bgm_vol, true);

    SEs = [FIRE_SE, ITEM_SE, DEAD_SE];

    init();
}

//////Buttons//////
function setup() {
    //わかりやすいのでp5で管理
    //////Button//////
    startBut = createButton("Start");
    startBut.mousePressed(() => {
        socket.emit("start");
    });

    //////Check Boxes//////
    bgmChk = createCheckbox("BGM", false);
    bgmChk.changed(() => {
        if (BGM01 != null) {
            if (bgmChk.checked()) {
                BGM01.play();
            } else if (BGM01.isPlaying) {
                BGM01.stop();
            }
        }
    });

    seChk = createCheckbox("SE", false);
    seChk.changed(() => {
        console.log(seChk.checked());
        if (!seChk.checked()) {
            SEs.forEach(SE => {
                if (SE.isPlaying) SE.stop();
            });
        }
    });

    //////Slider//////
    volSld = createSlider(0, 1, bgm_vol, 0.05);

    startBut.parent("UI");
    bgmChk.parent("UI");
    volSld.parent("UI");
    seChk.parent("UI");
}

function init() {
    statsDisplay = document.getElementById("statsDisplay");
    statsDisplay.innerHTML = aliveMessage;

    //////Renderer//////
    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector("#canvas")
    });
    renderer.shadowMap.enabled = true;

    //////Camera//////
    camera = new THREE.PerspectiveCamera(
        45, 1, 1000, cameraDistance * 3 //画角、アスペクト比、描画開始距離、描画終了距離
    );
    camera.rotation.x -= cameraAngleX;
    //audiolistenerをカメラの子にする
    camera.add(listener);

    //////Effekseer//////
    context = effekseer.createContext();
    context.init(renderer.getContext());
    FIRE_EFFECT = context.loadEffect(
        "assets/effects_ver1.0/exp2.efk",
        12.0, () => {
        });

    DEAD_EFFECT = context.loadEffect(
        "assets/effects_ver1.0/dead2.efk",
        20, () => {
        });

    ITEM_EFFECT = context.loadEffect(
        "assets/effects_ver1.0/item.efk",
        50, () => {
        });

    //////Light//////
    const dirLight = new THREE.DirectionalLight(0xffffff, dirLightIntensity);

    dirLight.position.set(
        Math.floor(WIDTH_LENGTH / 2) * SIZE_WALL - 1500,
        1500,
        -Math.floor(HEIGHT_LENGTH / 2) * SIZE_WALL
    );
    dirLight.target.position.set(
        Math.floor(WIDTH_LENGTH / 2) * SIZE_WALL,
        0,
        -Math.floor(HEIGHT_LENGTH / 2) * SIZE_WALL + 200
    )

    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -SIZE_WALL * WIDTH_LENGTH / 1.5
    dirLight.shadow.camera.right = SIZE_WALL * WIDTH_LENGTH / 1.5
    dirLight.shadow.camera.top = SIZE_WALL * HEIGHT_LENGTH / 1.5
    dirLight.shadow.camera.bottom = -SIZE_WALL * HEIGHT_LENGTH / 1.5
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 5000;

    scene.add(dirLight);
    scene.add(dirLight.target);
    scene.add(new THREE.CameraHelper(dirLight.shadow.camera))

    const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambLight);

    //////Ground//////
    scene.add(GROUND);
    GROUND.position.set(
        Math.floor(WIDTH_LENGTH / 2) * SIZE_WALL,
        -30,
        -Math.floor(HEIGHT_LENGTH / 2) * SIZE_WALL
    );
    GROUND.scale.set(16, 16, 16);

    //////Listeners//////
    socket.on("field", (field) => {
        //パフォーマンスがどうかは分からないが、フィールドの変化があったとき、objがあれば削除し、fieldの値によりobjを追加。
        for (let h = 0; h < THICKNESS_LENGTH; h++) {
            for (let i = 0; i < HEIGHT_LENGTH; i++) {
                for (let j = 0; j < WIDTH_LENGTH; j++) {
                    const pnum = FIELD_NUM[h][i][j];
                    const num = field[h][i][j];
                    if (pnum != num) {
                        //前と違うならオブジェクトを削除し、以下のSwitchで新しくオブジェクトを追加
                        let is_item = false;
                        if (pnum < 0) is_item = true;
                        remove_obj(h, i, j, is_item); //アイテムとったよっていうイベントをサーバーから受け取ってもいいかも。

                        //////Objects//////
                        switch (num) {
                            case OUTERWALL_NUM:
                                FIELD[h][i][j] = add_obj(h, i, j, OUTERWALL); break;

                            case WALL_NUM:
                                FIELD[h][i][j] = add_obj(h, i, j, WALL); break;

                            case BLOCK_NUM:
                                FIELD[h][i][j] = add_obj(h, i, j, BLOCK); break;

                            case BOMB_NUM:
                            case BOMB_PUNCHED_NUM:
                                FIELD[h][i][j] = add_obj(h, i, j, BOMB); break;

                            case FLOOR01_NUM:
                                FIELD[h][i][j] = add_obj(h, i, j, FLOOR01); break;

                            case FLOOR02_NUM:
                                FIELD[h][i][j] = add_obj(h, i, j, FLOOR02); break;

                            default:
                                //  負の値はアイテム。defaultが呼ばれるのは負の時だけなはずだが、一応条件分岐。
                                if (num < 0) {
                                    is_item = true
                                    FIELD[h][i][j] = add_obj(h, i, j, ITEMs[ITEM_NUM + num], is_item); break;
                                }
                        }
                    }
                }
            }
        }
        FIELD_NUM = field.slice();
    });

    socket.on("move-bomb", (tindex, index, id, is_stopped = false, is_kick = false) => {
        if (moving_bombs[id] == undefined) {
            const {h, i, j} = tindex;
            moving_bombs[id] = add_obj(h, i, j, BOMB);
            remove_obj(h, i, j);
        }
        if (is_stopped) {
            remove_moving_bomb(id, is_kick);
        } else {
            set_obj(moving_bombs[id], index);
        }
    });

    socket.on("stop-bomb", id => {
        remove_moving_bomb(id);
    });

    //エフェクトの値はFIELDに代入しない
    socket.on("fire", (indexs, objID) => {
        play_SE(FIRE_SE);

        for (const index of indexs) {
            fire_indexs.push(index);

            play_EFK(FIRE_EFFECT, index);

            setTimeout(() => {
                fire_indexs.shift();
            }, explosionRemainTime);
        }

        if (objID != null) {
            if (moving_bombs[objID] != undefined) {
                remove_moving_bomb(objID);
            }
        }
    });

    //chrs-info-updateを受け取ったら情報をもとに位置、向き、アニメーションを変更
    socket.on("chrs-info-update", chrs => {
        chrsInfo = chrs
        chrsInfo[socket.id] = Object.assign({}, myChrInfo);

        for (const id in chrsInfo) {
            const {pos, status, angle} = chrsInfo[id];
            if (animActs[id] != undefined) {
                switch (status) {
                    case "idle":
                    case "wait":
                        play_anim(id, "idle"); break;

                    case "walk":
                        play_anim(id, "walk"); break;

                    case "bomb-hold":
                    case "bomb-hold-wait":
                        play_anim(id, "bomb-hold"); break;

                    case "bomb-hold-walk":
                        play_anim(id, "bomb-hold-walk"); break;

                    case "stan":
                        play_anim(id, "stan"); break;

                    case "dead":
                        if (is_alive[id]) {
                            Object.keys(animActs[id]).forEach(actKey => {animActs[id][actKey].stop();});
                            is_alive[id] = false;
                            play_SE(DEAD_SE);
                        }
                        context.play(DEAD_EFFECT, pos.x, pos.y, pos.z);
                        break;
                }
            }

            if (chrsObj[id] != undefined) {
                chrsObj[id].position.set(pos.x, pos.y, pos.z);
                chrsObj[id].rotation.set(0, angle, 0);
            }
        }
    });

    socket.on("init-info", chrs => {
        chrsInfo = Object.assign({}, chrs);
        //自分の情報はサーバーから受け取ると誤差を生み出すかもしれないので、自分でハンドル
        myChrInfo = Object.assign({}, chrs[socket.id]);
        myChrInfo.pos = json2vec(myChrInfo.pos);
        myChrInfo.dir = json2vec(myChrInfo.dir);

        //変数などの初期化
        //初期化を受け取ったので、いままでいたキャラクターObjをシーンObjから削除する。
        for (const id in chrsObj) {
            scene.remove(chrsObj[id]);
        }
        chrsObj = {};
        animMixers = {};
        is_alive = {};
        statsDisplay.innerHTML = aliveMessage;
        BGM01.setPlaybackRate(1);
        context.stopAll();

        for (const id in chrsInfo) {
            chrsObj[id] = SkeletonUtils.clone(CHR);
            animMixers[id] = new THREE.AnimationMixer(chrsObj[id]);
            is_alive[id] = true;

            let stanAct = animMixers[id].clipAction(CHR.animations[1])
            let idleAct = animMixers[id].clipAction(CHR.animations[5]);
            let idleAct2 = animMixers[id].clipAction(CHR.animations[4]);
            let walkAct = animMixers[id].clipAction(CHR.animations[2]);
            let walkAct2 = animMixers[id].clipAction(CHR.animations[0]);

            animActs[id] = {
                "stan": stanAct,
                "idle": idleAct,
                "bomb-hold": idleAct2,
                "walk": walkAct,
                "bomb-hold-walk": walkAct2
            }

            chrsObj[id].position.set(
                chrsInfo[id].pos.x, chrsInfo[id].pos.y, chrsInfo[id].pos.z
            );

            scene.add(chrsObj[id]);
        }

        //カメラのポジションの初期化
        camera.position.set(cameraPosX, cameraPosY, cameraPosZ);

        //start BGM
        if (BGM01 != null && bgmChk.checked()) {
            if (BGM01.isPlaying) BGM01.stop();
            BGM01.play();
        }

        got_init = can_move = true;
        startBut.removeAttribute("disabled");
    });

    socket.on("received-start", () => {
        got_init = can_move = false;
        startBut.attribute("disabled", "");
    });

    //////First Resize//////
    onResize();
    socket.emit("start");

    /////////////////////////////////////////////////////////
    (function tick() {
        requestAnimationFrame(tick);

        let frameTime = clock.getDelta();

        for (const id in animMixers) {
            animMixers[id].update(frameTime);
        }

        if (got_init) {
            move_chrs(frameTime);
            move_camera();

            if (is_keyon[KEY_CODE.r]) {
                socket.emit("start");
                is_keyon[KEY_CODE.r] = false;
            }
        }

        //////set BGM Volume//////
        if (bgm_vol != volSld.value()) {
            bgm_vol = volSld.value();
            BGM01.setVolume(bgm_vol);
        }

        //////Render//////
        renderer.render(scene, camera);

        //////Context of effekseer//////
        context.setProjectionMatrix(camera.projectionMatrix.elements);
        context.setCameraMatrix(camera.matrixWorldInverse.elements);

        context.update(frameTime * 60.0);
        context.draw();

    })();
    //////////////////////////////////////////////////////////
}

function keydown(event) {
    is_keyon[event.keyCode] = true;
}

function keyup(event) {
    is_keyon[event.keyCode] = false;
}

function move_chrs(frameTime) {
    const id = socket.id;
    let delta = myChrInfo.speed * frameTime;
    let is_send = true;
    let {pos, dir, status, angle, can_punch, can_kick, can_hold} = myChrInfo;
    let index = get_index(pos);

    /**
     * Order:
     * 1: 死んでいるときの処理。
     * 2: 死ぬかどうかの処理
     * 3: スタンするかどうかの処理 //未実装。ここで確認するほうが良いかな。
     * 4: スタン状態の処理
     * 5: 動ける時の処理
     *    --死んでいる状態
     *    --爆弾を持っている状態
     *    --生きている状態
     */
    if (status == "dead") {
        if (pos.y < cameraDistance * 3) {
            pos.add((dir.clone()).multiplyScalar(delta * 3));
        } else {
            myChrInfo.status = "wait";
            myChrInfo.angle = Math.PI;
            myChrInfo.speed = 600;
            pos.set(0, SIZE_WALL, 0);
            can_move = true;
        }

    } else if (get_is_hit_fire(index)) {
        statsDisplay.innerHTML = deadMessage;

        if (status == "bomb-hold" || status == "bomb-hold-walk") {
            socket.emit("bomb-throw", get_angle2dir(angle));
        }

        myChrInfo.status = "dead";
        myChrInfo.fireLen = 2;
        dir.setY(3);
        BGM01.setPlaybackRate(0.8);
        can_move = false;

    } else if (status == "stan") {
        is_send = false;
        setTimeout(() => { //きわどいときバグが起きそう。どうなるかはわからない。バグが出たら突貫工事で何とかする。
            if (is_alive[id]) {
                myChrInfo.status = "idle";
            }
        }, stanTime);

    } else if (can_move) {
        //キー入力から進む向きをベクトルで出す。
        get_direction(dir);

        //////Move//////
        if (status == "wait" || status == "bomb-hold-wait") {
            if (!dir.equals(new THREE.Vector3())) {
                dir.normalize();
                if (get_is_touch_outerWall(pos, dir)) {
                    pos.add((dir.clone()).multiplyScalar(delta));
                }
                //移動後のインデックスを取得。インデックスによって向きを変化。
                const {i, j} = get_index(pos);
                let _angle = 0;

                if (i == HEIGHT_LENGTH - 1) _angle = 0;
                else if (j == 0) _angle = Math.PI / 2;
                else if (i == 0) _angle = Math.PI;
                else if (j == WIDTH_LENGTH - 1) _angle = Math.PI / 2 * 3;

                myChrInfo.angle = _angle;
            }

            //status change
            if (placed_bombNum == 0 && status != "bomb-hold-wait") {
                index = get_index(pos);
                const {h, i, j} = index;
                if (FIELD_NUM[h][i][j] != BOMB_NUM) {

                    myChrInfo.status = "bomb-hold-wait";
                    socket.emit("bomb", index);
                    setTimeout(() => {
                        socket.emit("bomb-hold", index);
                    }, 40); //ちょっと強引。
                }
            }

            if (is_keyon[KEY_CODE.SPACE]) {
                is_keyon[KEY_CODE.SPACE] = false;
                if (status == "bomb-hold-wait") {
                    index = get_index(pos);
                    const {h, i, j} = index;
                    if (0 < i && i < HEIGHT_LENGTH - 1 ||
                        0 < j && j < WIDTH_LENGTH - 1) {
                        socket.emit("bomb-throw", get_angle2dir(angle), 3);
                        myChrInfo.status = "wait";
                        placed_bombNum++;
                        setTimeout(() => {
                            placed_bombNum--;
                        }, explosionTime);
                    }
                }
            }

        } else if (status == "bomb-hold" || status == "bomb-hold-walk") {
            myChrInfo.status = "bomb-hold";

            if (!dir.equals(new THREE.Vector3())) {
                myChrInfo.status = "bomb-hold-walk";

                //////Set Char's Angle//////
                myChrInfo.angle = get_dir2angle(dir);
                //////Set Char's Position//////
                dir.normalize();
                if (!get_is_hit(pos, dir)) {
                    pos.add((dir.clone()).multiplyScalar(delta));
                }
            }

            index = get_index(pos);
            const {h, i, j} = index;
            const num = FIELD_NUM[h][i][j];

            //////Num Chack//////
            num_check(num, index);

            if (is_keyon[KEY_CODE.SPACE]) {
                myChrInfo.status = "idle";
                socket.emit("bomb-throw", get_angle2dir(angle));
                is_keyon[KEY_CODE.SPACE] = false;
            }

        } else {
            myChrInfo.status = "idle";

            if (!dir.equals(new THREE.Vector3())) {
                myChrInfo.status = "walk";

                //////Set Char's Angle//////
                myChrInfo.angle = get_dir2angle(dir);
                //////Set Char's Position//////
                dir.normalize();
                if (!get_is_hit(pos, dir)) {
                    pos.add((dir.clone()).multiplyScalar(delta));
                }
            }

            index = get_index(pos);
            const {h, i, j} = index;
            const num = FIELD_NUM[h][i][j];

            //////Num Chack//////
            num_check(num, index);

            //////Bomb//////
            if (is_keyon[KEY_CODE.SPACE]) {
                if (num != BOMB_NUM &&
                    num != BOMB_KICKED_NUM &&
                    placed_bombNum < myChrInfo.bombNum
                ) {
                    socket.emit("bomb", index);
                    placed_bombNum++;
                    setTimeout(() => {
                        placed_bombNum--;
                    }, explosionTime);
                } is_keyon[KEY_CODE.SPACE] = false;
            }

            if (is_keyon[KEY_CODE.k]) {
                is_keyon[KEY_CODE.k] = false;
                if (can_kick) {
                    const tindex = get_tindex(pos, dir, SIZE_CHR);
                    const {h, i, j} = tindex;
                    const tnum = FIELD_NUM[h][i][j];

                    if (tnum == BOMB_NUM || tnum == BOMB_PUNCHED_NUM) {
                        //斜めじゃない時。
                        if (Math.abs(dir.x) == 1 || Math.abs(dir.y) == 1 || Math.abs(dir.z) == 1) {
                            //蹴ってもすぐ止まらないときにイベントを送る。サーバーの負担軽減や、無駄なオブジェクトの削除追加をしないため。
                            if (FIELD_NUM[h][i - dir.z][j + dir.x] <= 0) {
                                let bombID = FIELD[h][i][j].uuid;
                                socket.emit("bomb-kick", tindex, dir, bombID);
                                kicking_bomb_ids.push(bombID);
                            }
                        }
                    }
                }

            } else if (is_keyon[KEY_CODE.l]) {
                if (kicking_bomb_ids.length > 0) {
                    socket.emit("bomb-stop", kicking_bomb_ids.shift());
                } is_keyon[KEY_CODE.l] = false;

            } else if (is_keyon[KEY_CODE.j]) {
                is_keyon[KEY_CODE.j] = false;
                if (can_punch) {
                    const tindex = get_tindex(pos, dir, SIZE_CHR);
                    const {h, i, j} = tindex;
                    const tnum = FIELD_NUM[h][i][j];

                    if (tnum == BOMB_NUM || tnum == BOMB_PUNCHED_NUM) {
                        //斜めじゃない時。
                        if (Math.abs(dir.x) == 1 || Math.abs(dir.y) == 1 || Math.abs(dir.z) == 1) {
                            socket.emit("bomb-punch", tindex, dir, FIELD[h][i][j].uuid);
                        }
                    }
                }

            } else if (is_keyon[KEY_CODE.h]) {
                is_keyon[KEY_CODE.h] = false;
                if (can_hold) {
                    if (num == BOMB_NUM || num == BOMB_PUNCHED_NUM) {
                        socket.emit("bomb-hold", index);
                        myChrInfo.status = "bomb-hold";
                    }
                }
            }
        }
    }

    if (is_send) socket.emit("chr-info", myChrInfo);
}

function move_camera() {
    let targetX, targetZ, num, pos;
    targetX = targetZ = num = pos = 0;

    for (const id of Object.keys(chrsObj)) {
        if (chrsInfo[id].status != "dead") {
            pos = chrsObj[id].position;
            targetX += pos.x;
            targetZ += pos.z;
            num++;
        }
    }
    if (num != 0) {
        targetX /= num;
        targetZ /= num;

        let tpos = new THREE.Vector3(targetX, 0, targetZ);
        cameraDistance = pos.distanceTo(tpos) + cameraMinDistance;
    }

    set_cameraPos();

    camera.position.x += (targetX - camera.position.x) * easing_num;
    camera.position.y += (cameraPosY - camera.position.y) * easing_num;
    camera.position.z += (targetZ + cameraPosZ - camera.position.z) * easing_num;
}

function set_obj(obj, index) {
    let pos = get_coord(index);
    obj.position.set(pos.x, pos.y, pos.z);
}

function get_index(chr_pos) {
    return {
        h: Math.floor((chr_pos.y + SIZE_WALL) / SIZE_WALL),
        i: Math.floor((-chr_pos.z + SIZE_WALL / 2) / SIZE_WALL),
        j: Math.floor((chr_pos.x + SIZE_WALL / 2) / SIZE_WALL)
    };
}

function get_tindex(pos, dir, size) {
    let tpos = (pos.clone()).add((dir.clone()).multiplyScalar(size));
    return get_index(tpos);
}

function get_coord(index) {
    return {
        x: index.j * SIZE_WALL,
        y: (index.h - 1) * SIZE_WALL,
        z: -index.i * SIZE_WALL
    }
}

function get_direction(dir) {
    dir.set(0, 0, 0);

    if (is_keyon[KEY_CODE.w]) {
        dir.add(new THREE.Vector3(0, 0, -1));
    }
    if (is_keyon[KEY_CODE.a]) {
        dir.add(new THREE.Vector3(-1, 0, 0));
    }
    if (is_keyon[KEY_CODE.s]) {
        dir.add(new THREE.Vector3(0, 0, 1));
    }
    if (is_keyon[KEY_CODE.d]) {
        dir.add(new THREE.Vector3(1, 0, 0));
    }
}

function get_dir2angle(dir) {
    let angle = new THREE.Vector3(0, 0, 1).angleTo(dir);
    //angleToの性質上、小さい角度が返り値なので、以下の処理をする。
    if (dir.x < 0) angle = 2 * Math.PI - angle;

    return angle;
}

function get_angle2dir(angle) {
    let dir = new THREE.Vector3();

    if (angle == Math.PI) {
        dir.add(new THREE.Vector3(0, 0, -1));
    }
    if (angle == Math.PI / 2 * 3) {
        dir.add(new THREE.Vector3(-1, 0, 0));
    }
    if (angle == 0) {
        dir.add(new THREE.Vector3(0, 0, 1));
    }
    if (angle == Math.PI / 2) {
        dir.add(new THREE.Vector3(1, 0, 0));
    }

    return dir;
}

function get_is_hit(pos, dir) {
    const index = get_index(pos);
    const tindex = get_tindex(pos, dir, SIZE_CHR / 2);
    const {h, i, j} = tindex;
    let num = FIELD_NUM[h][i][j];
    if (!get_is_equal(tindex, index)) {
        if (num > 0) return true;
    } return false;
}

function get_is_hit_fire(index) {
    for (const findex of fire_indexs) {
        if (get_is_equal(findex, index)) return true;
    } return false;
}

function get_is_touch_outerWall(pos, dir) {
    const tindex = get_tindex(pos, dir, SIZE_CHR / 2);
    const {h, i, j} = tindex;
    if (i >= 0 && j >= 0 && i < HEIGHT_LENGTH && j < WIDTH_LENGTH) {
        if (FIELD_NUM[h - 1][i][j] == OUTERWALL_NUM) {
            return true;
        }
    } return false;
}

function get_is_equal(index1, index2) {
    return (
        index1.h == index2.h &&
        index1.i == index2.i &&
        index1.j == index2.j
    );
}

function set_cameraPos() {
    cameraPosY = cameraDistance * Math.sin(cameraAngleX);
    cameraPosZ = cameraDistance * Math.cos(cameraAngleX) + 2 * SIZE_WALL;
}

function num_check(num, index) {
    //////Item//////
    if (num < 0) {
        socket.emit("got-item", index);

        if (!got_item) {
            switch (num) {
                case ITEM_SPEEDUP_NUM:
                    if (myChrInfo.speed < SPEED_MAX)
                        myChrInfo.speed += 80; break;
                case ITEM_BOMBUP_NUM:
                    if (myChrInfo.bombNum < BOMBNUM_MAX)
                        myChrInfo.bombNum++; break;
                case ITEM_FIREUP_NUM:
                    if (myChrInfo.fireLen < FIRELEN_MAX)
                        myChrInfo.fireLen++; break;
                case ITEM_PUNCH:
                    myChrInfo.can_punch = true; break;
                case ITEM_KICK:
                    myChrInfo.can_kick = true; break;
                case ITEM_HOLD:
                    myChrInfo.can_hold = true; break;

                default: console.log("error in move_chr item", num); break;
            }
            console.log("got");
            got_item = true;
            setTimeout(() => {
                got_item = false;
            }, 200);
        }

        //////Touch Moving Bomb//////
    } else if (num == BOMB_KICKED_NUM || num == BOMB_PUNCHED_NUM) {
        myChrInfo.status = "stan";
    }
}

//SkinnedMeshのcloneがObject3D.cloneではサポートされていない
//SkeletonUtilsのcloneメソッドを用いてFBXをクローンすることができる
function add_obj(h, i, j, obj, is_item = false) {
    let _obj = SkeletonUtils.clone(obj);
    scene.add(_obj);

    //アニメーションがあるならアニメーションを設定
    if (obj.animations.length > 0) {
        let id = _obj.uuid;
        animMixers[id] = new THREE.AnimationMixer(_obj);
        animMixers[id].clipAction(obj.animations[0]).play();
    }
    set_obj(_obj, toIndex(h, i, j));

    //アイテムならエフェクトを再生
    if (is_item) {
        play_EFK(ITEM_EFFECT, toIndex(h, i, j));
    }

    return _obj;
}

//アニメーションミキサーの削除とシーンからオブジェクトを削除してくれる関数
function remove_obj(h, i, j, is_item = false) {
    obj = FIELD[h][i][j];
    scene.remove(obj);
    delete animMixers[obj.uuid];
    FIELD[h][i][j] = 0;

    if (is_item) play_SE(ITEM_SE);
}

function remove_moving_bomb(id, is_kick = true) {
    let obj = moving_bombs[id]

    if (is_kick) {
        let index = kicking_bomb_ids.indexOf(id);
        delete animMixers[obj.uuid];
        if (index != -1) { //この条件分岐はいらないかも？
            kicking_bomb_ids.splice(index, 1);
        }
    }

    scene.remove(obj);

    //なんか知らんが、deleteを呼ぶと削除できんくなる。非同期の関係かな。
    //ただ、メモリの関係もあるとおもうのでsetTImeoutで削除する
    setTimeout(() => {
        delete moving_bombs[id];
    }, 500);
}

function play_SE(SE) {
    if (SE.isPlaying) SE.stop();
    if (seChk.checked()) SE.play();
}

function play_EFK(efk, index) {
    const {x, y, z} = get_coord(index);
    context.play(efk, x, y, z);
}

function play_anim(id, act) {
    Object.keys(animActs[id]).forEach(actKey => {if (actKey != act) animActs[id][actKey].stop();});
    animActs[id][act].play();
}

function toIndex(h, i, j) {
    return {"h": h, "i": i, "j": j};
}

function json2vec(json) {
    return new THREE.Vector3(json.x, json.y, json.z);
}

