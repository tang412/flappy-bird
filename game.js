// 加载场景
let loadScene = {
	preload() {
		// images
		this.load.image('background', 'assets/background.png');
		this.load.image('playButton', 'assets/start-button.png');
		this.load.image('scoreboard', 'assets/scoreboard.png');
		this.load.image('ground', 'assets/ground.png');
		this.load.image('flappyBirdText', 'assets/title.png');
		this.load.image('getReadyText', 'assets/get-ready.png');
		this.load.image('gameOverText', 'assets/gameover.png');
		this.load.image('tutorials', 'assets/instructions.png');

		// spritesheets
		this.load.spritesheet('pajaro', 'assets/bird.png', {
			frameWidth: 34,
			frameHeight: 24
		});
		this.load.spritesheet('pipes', 'assets/pipes.png', {
			frameWidth: 54,
			frameHeight: 320
		});

		// audio
		this.load.audio('ouch', 'assets/ouch.wav');
		this.load.audio('ground-hit', 'assets/ground-hit.wav');
		this.load.audio('score', 'assets/score.wav');
		this.load.audio('flap', 'assets/flap.wav');

		// loadingText
		let loadingPrecentText = this.add.text(20, 100, '');
		let loadingAssetText = this.add.text(20, 120, '');

		this.load.on('progress', function (val) {
			loadingPrecentText.setText(`Precent: ${parseInt(val * 100) + '%'}`);
		});
		this.load.on('fileprogress', function (asset) {
			loadingAssetText.setText(`AssetKey: ${asset.key}`);
		});
	},
	create() {
		this.anims.create({
			key: 'fly',
			frames: this.anims.generateFrameNumbers('pajaro'),
			frameRate: 10,
			repeat: -1
		});
		this.scene.start('ready');
	}
};

// 准备场景
let readyScene = {
	key: 'ready',
	create() {
		this.background = this.add.tileSprite(144, 252.5, 288, 505, 'background');
		this.ground = this.add.tileSprite(168, 449, 335, 112, 'ground');
		this.playButton = this.add.image(92, 284, 'playButton').setOrigin(0, 0);
		// 设置可交互
		this.playButton.setInteractive();
		this.playButton.on('pointerdown', this.scene.start.bind(this.scene, 'play'));
		this.flappyBirdText = this.add.image(34, 120, 'flappyBirdText').setOrigin(0, 0);
		this.pajaro = this.add.sprite(220, 120, 'pajaro').setOrigin(0, 0);
		this.pajaro.play('fly');
		this.tweens.add({
			targets: [this.flappyBirdText, this.pajaro],
			duration: 1000,
			y: 100,
			yoyo: true,
			repeat: -1
		});
	},
	update() {
		this.background.tilePositionX += 1;
		this.ground.tilePositionX += 2;
	}
};

// 玩耍场景
let playScene = {
	key: 'play',
	init() {
		// 物理组
		this.pipeGroup = this.physics.add.group();

		// 物理组子数组
		this.pipeChildren = this.pipeGroup.getChildren();

		// 步进 基础宽加管道宽
		this.step = 100 + 54;

		// 分数
		this.score = 0;

		// 制造管道
		this.makePipes = function (x) {
			let topPipe = this.add.sprite(0, 0, 'pipes', 0).setOrigin(0, 1);
			let bottomPipe = this.add.sprite(0, 0, 'pipes', 1).setOrigin(0, 0);
			return this.resetPipesPosition([topPipe, bottomPipe]);
		};

		// 重设管道坐标
		this.resetPipesPosition = function (pipes) {
			// 管道间隙
			let gap = Phaser.Math.Between(90, 120);
			// 上管道坐标
			let topPipeY = Phaser.Math.Between(120, 200);
			// 下管道坐标
			let bottomPipeY = gap + topPipeY;
			// 要移动的横坐标
			// （如果子数组长度小于2就使用游戏配置宽度，否则使用最后一个管道的横坐标加步进）
			let x = this.pipeChildren.length < 2 ? config.width : this.pipeChildren[this.pipeChildren.length - 1].x + this.step;

			pipes[0].setPosition(x, topPipeY);
			pipes[1].setPosition(x, bottomPipeY);

			return pipes;
		};

		// 使帕加罗掉落
		this.makePajaroFall = function () {
			this.sound.play('ouch');
			this.scene.pause().launch('over');
		}.bind(this);
	},
	create() {
		// 添加背景
		this.background = this.add.tileSprite(144, 252.5, 288, 505, 'background');

		// 初始添加4组管道
		for (let i = 0; i < 4; i++) {
			let pipes = this.makePipes();
			this.pipeGroup.addMultiple(pipes);
		}

		// 设置横坐标速度
		this.pipeGroup.setVelocityX(-120);

		// 添加地面
		this.ground = this.add.tileSprite(168, 449, 335, 112, 'ground');
		this.physics.add.existing(this.ground, true);

		// 添加小鸟(帕加罗)
		this.pajaro = this.physics.add.sprite(50, 100, 'pajaro');
		this.pajaro.setGravityY(800);
		this.pajaro.setCollideWorldBounds(true);
		this.pajaro.play('fly');

		// 添加事件
		this.input.on(
			'pointerdown',
			function () {
				this.pajaro.setVelocityY(-260);
				this.sound.play('flap');
				this.tweens.add({
					targets: this.pajaro,
					duration: 100,
					angle: -30
				});
			},
			this
		);

		// 添加计分文本
		this.scoreText = this.add.text(10, 10, `Score: ${this.score}`);

		// 添加碰撞器
		this.physics.add.collider(this.pajaro, this.ground, this.makePajaroFall);

		// 添加重叠触发
		this.physics.add.overlap(this.pajaro, this.pipeGroup, this.makePajaroFall);
	},
	update() {
		this.background.tilePositionX += 1;
		this.ground.tilePositionX += 2;
		if (this.pajaro.angle < 45) {
			this.pajaro.angle += 2;
		}

		let children = this.pipeChildren;

		// 如果第一个管道超过屏幕宽度 移除管道子数组前两项并重设管道坐标后重新推入管道子数组
		if (this.pipeChildren[0].x < -45) {
			children.push(...this.resetPipesPosition([children.shift(), children.shift()]));
			this.scoreText.setText(`Score: ${++this.score}`);
			this.sound.play('score');
		}
	}
};

// 结束场景
let overScene = {
	key: 'over',
	create() {
		this.scene.pause('start');
		this.gameOverText = this.add.image(48, 30, 'gameOverText').setOrigin(0, 0);
		this.scoreBoard = this.add.image(30, 104, 'scoreboard').setOrigin(0, 0);
		this.playButton = this.add.image(92, 284, 'playButton').setOrigin(0, 0);
		this.playButton.setInteractive();
		this.playButton.on(
			'pointerdown',
			function () {
				// 结束自己
				this.scene.stop().stop('play').start('play');
			},
			this
		);
	}
};

// 游戏配置
let config = {
	width: 288,
	height: 505,
	type: Phaser.AUTO,
	// backgroundColor: 0xffffff,
	scale: {
		mode: Phaser.Scale.FIT
	},
	physics: {
		default: 'arcade',
		arcade: {
			debug: false
		}
	},
	scene: [loadScene, readyScene, playScene, overScene]
};

// 实例游戏
let game = new Phaser.Game(config);
console.log(game);
