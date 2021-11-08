using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using Button = UnityEngine.UI.Button;

public class DifficultyControl : MonoBehaviour
{
    public Button EasyButton;
    public Button NormalButton;
    public Button HardButton;

    void Awake()
    {
        SetDifficulty(DifficultySettings.DifficultyLevel);
    }

    public void SetDifficulty(Difficulty dif)
    {
        DifficultySettings.ChangeDifficulty(dif);
        switch (dif)
        {
            case Difficulty.Easy:
                EasyButton.interactable = false;
                NormalButton.interactable = true;
                HardButton.interactable = true;
                break;
            case Difficulty.Normal:
            default:
                EasyButton.interactable = true;
                NormalButton.interactable = false;
                HardButton.interactable = true;
                break;
            case Difficulty.Hard:
                EasyButton.interactable = true;
                NormalButton.interactable = true;
                HardButton.interactable = false;
                break;
        }
    }

    public void SetEasy()
    {
        SetDifficulty(Difficulty.Easy);
    }
    
    public void SetNormal()
    {
        SetDifficulty(Difficulty.Normal);
    }
    
    public void SetHard()
    {
        SetDifficulty(Difficulty.Hard);
    }
    
    
}
