using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class appearOnUnlocked : MonoBehaviour
{
    public Text text;
    // Start is called before the first frame update
    void Start()
    {
        text.enabled = false;
        ExitDoor.onUnlock += Appear;
    }
    
    void Appear()
    {
        text.enabled = true;
    }

    void OnDestroy()
    {
        ExitDoor.onUnlock -= Appear;
    }
}
