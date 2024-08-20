package field_builder

import "bomber-man/domain"

type DebugFieldBuilder struct {
	domain.FieldConfig
}

func (c *DebugFieldBuilder) BuildFieldType(k, i, j int) domain.FieldType {
	switch {
	case k == 0:
		switch {
		case i <= 1 || j <= 1 || i >= c.Height-2 || j >= c.Width-2:
			return domain.FloorGreen
		default:
			return domain.FloorYellow
		}
	case k == 1:
		switch {
		case i == 0 || j == 0 || i == c.Height-1 || j == c.Width-1:
			return domain.WallOuter
		case i%2 == 0 && j%2 == 0:
			return domain.WallInner
		case (2 < i && i < c.Height-3) || (2 < j && j < c.Width-3):
			return domain.Lot(c.BrickAppearRate, domain.Brick, domain.Empty)
		}
	}
	return domain.Empty
}

func (c *DebugFieldBuilder) Config() domain.FieldConfig {
	return c.FieldConfig
}

func NewDebugFieldBuilder() domain.FieldBuilder {
	config := domain.NewDefaultFieldConfig()

	config.Width = 11
	config.Height = 7

	config.BrickAppearRate = 0
	config.InitialSpawnIndexes = []domain.Index{
		{K: 1, I: 1, J: 1},
		{K: 1, I: 5, J: 9},
		{K: 1, I: 5, J: 1},
		{K: 1, I: 1, J: 9},
	}

	return &DebugFieldBuilder{
		config,
	}
}
