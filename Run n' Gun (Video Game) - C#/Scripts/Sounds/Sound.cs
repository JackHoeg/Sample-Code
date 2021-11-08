using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Audio;

public enum AudioLayer : byte
{
    Effects,
    Music,
    UI
}

[System.Serializable]
public class Sound
{
    public string name;

    public AudioClip clip;

    public AudioLayer mixGroup;

    [Range(0f, 1)]
    public float volume;

    [Range(0f, 1)]
    public float pitch;

    public bool pauseable = true;

    public bool loop;

    public bool playOnAwake;

    [HideInInspector]
    public AudioSource source;
}
