package domain

import "time"

type FieldConfig struct {
	Width  int `json:"width"`
	Height int `json:"height"`
	Depth  int `json:"depth"`

	ObjectPath map[FieldType]string `json:"objectPath"`
	NonBlocker []FieldType          `json:"nonBlocker"`
	Breakable  []FieldType          `json:"breakable"`
	Ignorable  []FieldType          `json:"ignorable"`
	Items      []FieldType          `json:"items"`

	BrickAppearRate float32
	ItemAppearRate  float32

	InitialSpawnIndexes []Index `json:"initialSpawnIndexes"`

	// per 1 unit
	BombSpeed time.Duration `json:"bombSpeed"`
}

func (c *FieldConfig) Valid(index Index) bool {
	return 0 <= index.K && index.K < c.Depth &&
		0 <= index.I && index.I < c.Height &&
		0 <= index.J && index.J < c.Width
}

func NewDefaultFieldConfig() FieldConfig {
	items := []FieldType{
		ItemPowerUp,
		ItemBombUp,
		ItemSpeedUp,
		ItemCanKick,
		// ItemCanPunch,
		// ItemCanHold,
	}
	return FieldConfig{
		Width:  19,
		Height: 13,
		Depth:  3,

		ObjectPath: map[FieldType]string{
			WallOuter:   "block/outerWall",
			WallInner:   "block/wall1",
			Brick:       "block/block",
			FloorGreen:  "block/floor02",
			FloorYellow: "block/floor03",
			ItemPowerUp: "item/fireUp",
			ItemBombUp:  "item/bombUp",
			ItemSpeedUp: "item/speedUp",
			ItemCanKick: "item/kick",
			// ItemCanPunch: "item/punch",
			// ItemCanHold:  "item/hold",
		},
		NonBlocker: append([]FieldType{Empty}, items...),
		Breakable:  []FieldType{Brick},
		Ignorable:  []FieldType{Empty},
		Items:      items,

		BrickAppearRate: 0.8,
		ItemAppearRate:  0.5,

		InitialSpawnIndexes: []Index{
			{K: 1, I: 1, J: 1},
			{K: 1, I: 11, J: 17},
			{K: 1, I: 11, J: 1},
			{K: 1, I: 1, J: 17},
		},

		BombSpeed: time.Millisecond * 250,
	}
}

type FieldBuilder interface {
	BuildFieldType(k, i, j int) FieldType
	Config() FieldConfig
}

type FieldType int

const (
	Empty FieldType = iota
	WallOuter
	WallInner
	Brick
	FloorGreen
	FloorYellow
	ItemPowerUp
	ItemBombUp
	ItemSpeedUp
	ItemCanKick
	ItemCanPunch
	ItemCanHold
)

type FieldDiff struct {
	Index Index     `json:"index"`
	Type  FieldType `json:"type"`
}
