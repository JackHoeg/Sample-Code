using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public enum Difficulty : byte
{
    Easy,
    Normal,
    Hard
}

public static class DifficultySettings
{
    private static Difficulty difficultyLevel = Difficulty.Normal;
    public static event Action onChangeDifficulty;

    public static Difficulty DifficultyLevel
    {
        get => difficultyLevel;
        set
        {
            difficultyLevel = value;
            onChangeDifficulty?.Invoke();
        }
    }

    public static void ChangeDifficulty(Difficulty dif)
    {
        DifficultyLevel = dif;
    }
}
