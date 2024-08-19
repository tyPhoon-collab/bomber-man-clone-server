package domain

import (
	"math/rand"
)

func Lot[T any](rate float32, hit T, miss T) T {
	if rand.Float32() < rate {
		return hit
	}
	return miss
}

func Dice[T any](list []T) T {
	return list[rand.Intn(len(list))]
}
