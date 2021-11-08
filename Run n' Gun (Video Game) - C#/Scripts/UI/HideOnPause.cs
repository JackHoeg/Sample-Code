using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/*
 * GameObjects must be enabled for this to work
 */
public class HideOnPause : MonoBehaviour
{
    public bool StartHidden = false;

    public void Start()
    {
        TimeHandler.onPause += Deactivate;
        TimeHandler.onResume += Activate;
        Activate();
    }

    private void OnDestroy()
    {
        TimeHandler.onPause -= Deactivate;
        TimeHandler.onResume -= Activate;
    }

    private void Activate()
    {
        gameObject.SetActive(!StartHidden);
    }
    
    private void Deactivate()
    {
        gameObject.SetActive(StartHidden);
    }
}
