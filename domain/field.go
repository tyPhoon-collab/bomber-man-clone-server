package domain

import (
	"maps"
	"slices"
)

var directions = [...]Index{
	{K: 0, I: -1, J: 0},
	{K: 0, I: 1, J: 0},
	{K: 0, I: 0, J: -1},
	{K: 0, I: 0, J: 1},
}

type Field struct {
	Data   [][][]FieldType `json:"data"`
	Config FieldConfig     `json:"config"`
}

func (f *Field) Get(index Index) FieldType {
	return f.Data[index.K][index.I][index.J]
}

func (f *Field) Set(index Index, t FieldType) {
	f.Data[index.K][index.I][index.J] = t
}

func (f *Field) Commit(fds []FieldDiff) {
	for _, fd := range fds {
		f.Set(fd.Index, fd.Type)
	}
}

// immutable operation
func (f *Field) DiffsExploded(bomb *Bomb, bombs []*Bomb) (map[Index]FieldDiff, error) {
	bomb.Ignited = true
	index := bomb.Index

	fds := map[Index]FieldDiff{
		index: {
			Index: index,
			Type:  Empty,
		},
	}

	bombMap := bombsToIndexedMap(bombs)

	for _, d := range directions {
		for i := 1; i <= int(bomb.Config.Power); i++ {
			idx := index.Add(d.Mul(i))

			if _, ok := fds[idx]; ok {
				continue
			}

			if bombMap[idx] != nil && !bombMap[idx].Ignited {
				fds_, _ := f.DiffsExploded(bombMap[idx], bombs)
				maps.Copy(fds, fds_)
				break
			} else if f.IsBreakable(idx) {
				fds[idx] = FieldDiff{
					Index: idx,
					Type: Lot(
						f.Config.ItemAppearRate,
						Dice(f.Config.Items),
						Empty,
					),
				}
				break
			} else if f.IsBlocker(idx) {
				break
			} else {
				fds[idx] = FieldDiff{
					Index: idx,
					Type:  Empty,
				}
			}
		}
	}

	return fds, nil
}

func bombsToIndexedMap(bombs []*Bomb) (bombMap map[Index]*Bomb) {
	bombMap = make(map[Index]*Bomb, 0)

	for _, b := range bombs {
		bombMap[b.Index] = b
	}
	return
}

func (f *Field) IsBreakable(index Index) bool {
	return slices.Contains(f.Config.Breakable, f.Get(index))
}

func (f *Field) IsNonBlocker(index Index) bool {
	return slices.Contains(f.Config.NonBlocker, f.Get(index))
}

func (f *Field) IsBlocker(index Index) bool {
	return !f.IsNonBlocker(index)
}

func (f *Field) IsItem(index Index) bool {
	return slices.Contains(f.Config.Items, f.Get(index))
}

func makeEmptyData(config FieldConfig) [][][]FieldType {
	d := make([][][]FieldType, config.Depth)

	for i := 0; i < config.Depth; i++ {
		d[i] = make([][]FieldType, config.Height)
		for j := 0; j < config.Height; j++ {
			d[i][j] = make([]FieldType, config.Width)
		}
	}

	return d
}

func NewField(builder FieldBuilder, config FieldConfig) *Field {
	d := makeEmptyData(config)

	for k := 0; k < config.Depth; k++ {
		for i := 0; i < config.Height; i++ {
			for j := 0; j < config.Width; j++ {
				ft := builder.BuildFieldType(k, i, j)

				d[k][i][j] = ft
			}
		}
	}

	return &Field{
		Data:   d,
		Config: config,
	}
}
