package domain

type Index struct {
	K int `json:"k"`
	I int `json:"i"`
	J int `json:"j"`
}

func (i Index) Add(i2 Index) Index {
	return Index{
		K: i.K + i2.K,
		I: i.I + i2.I,
		J: i.J + i2.J,
	}
}

func (i Index) Mul(n int) Index {
	return Index{
		K: i.K * n,
		I: i.I * n,
		J: i.J * n,
	}
}

// / from socket data
func NewIndexFromData(data any) Index {
	index := data.(map[string]interface{})

	return Index{
		K: int(index["k"].(float64)),
		I: int(index["i"].(float64)),
		J: int(index["j"].(float64)),
	}
}
