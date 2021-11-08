using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class AudioSettings : MonoBehaviour
{
    public GameObject toggleOther;
    
    public Slider fxSlider;
    public Slider musicSlider;
    public Slider uiSlider;

    private void Start()
    {
        fxSlider.value = AudioManager.audioManager.fxVol;
        musicSlider.value = AudioManager.audioManager.musicVol;
        uiSlider.value = AudioManager.audioManager.uiVol;
    }

    private void OnEnable()
    {
        toggleOther?.SetActive(false);
    }

    private void OnDisable()
    {
        toggleOther?.SetActive(true);
    }

    public void SetFxVol(float vol)
    {
        AudioManager.audioManager.fxVol = vol;
    }
    
    public void SetMusicVol(float vol)
    {
        AudioManager.audioManager.musicVol = vol;
    }
    
    public void SetUIVol(float vol)
    {
        AudioManager.audioManager.uiVol = vol;
    }
}
