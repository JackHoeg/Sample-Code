using UnityEngine.Audio;
using System;
using UnityEngine;

public class AudioManager : MonoBehaviour
{
    public float slowPitch = 0.5f;
    public float realPitch = 1f;
    public Sound[] sounds;

    public static AudioManager audioManager;
    private static AudioMixer mixer;

    private AudioMixerGroup fx;
    private AudioMixerGroup music;
    private AudioMixerGroup ui;

    public float fxVol
    {
        get
        {
            float val;
            mixer.GetFloat("EffectsVol", out val);
            val = Mathf.Pow(10, val * 0.05f);
            return val;
        }

        set => mixer.SetFloat("EffectsVol", Mathf.Log10(value) * 20f);
    }
    
    public float musicVol
    {
        get
        {
            float val;
            mixer.GetFloat("MusicVol", out val);
            val = Mathf.Pow(10, val * 0.05f);
            return val;
        }

        set => mixer.SetFloat("MusicVol", Mathf.Log10(value) * 20f);
    }
    
    public float uiVol
    {
        get
        {
            float val;
            mixer.GetFloat("UIVol", out val);
            val = Mathf.Pow(10, val * 0.05f);
            return val;
        }

        set => mixer.SetFloat("UIVol", Mathf.Log10(value) * 20f);
    }

    void Awake() //Initializes the sound list with audio sources
    {
        if (audioManager != null)
        {
            Destroy(gameObject);
            return;
        }

        audioManager = this;
        DontDestroyOnLoad(gameObject);

        mixer = Resources.Load<AudioMixer>("GeneralMixer");
        if (mixer == null)
        {
            Debug.LogError("MIXER NOT FOUND");
        }

        fx = mixer.FindMatchingGroups("Effects")[0];
        music = mixer.FindMatchingGroups("Music")[0];
        ui = mixer.FindMatchingGroups("UI")[0];
        
        foreach (Sound s in sounds)
        {
            s.source = AddSourceToObject(gameObject, s);
            if (s.playOnAwake) s.source.Play();
        }
        
        TimeHandler.onRefreshTime += TimeScalePitches;
        TimeHandler.onRealTime += TimeModePitches;
        TimeHandler.onSlowTime += TimeModePitches;
        TimeHandler.onPause += Pause;
        TimeHandler.onResume += UnPause;
    }

    public void Play (string name)
    {
        Sound s = Array.Find(sounds, sound => sound.name == name);
        if (s == null)
        {
            Debug.LogWarning("Sound: " + name + " not found!");
            return;
        }

        try
        {
            s.source.PlayOneShot(s.clip);
        }
        catch (Exception)
        {
            Debug.LogWarning("Clip " + name + " is null");
        }
    }

    //Plays clip at point in space
    public void PlayAtPoint(string name, Vector3 pos)
    {
        Sound s = Array.Find(sounds, sound => sound.name == name);
        if (s == null)
        {
            Debug.LogWarning("Sound: " + name + " not found!");
            return;
        }
        
        GameObject tmpAudio = new GameObject(name);
        tmpAudio.transform.position = pos;
        Add3DSourceToObject(tmpAudio, s).Play();
        
        Destroy(tmpAudio, s.clip.length);
    }

    public AudioSource Request3DSource(GameObject go, string name)
    {
        Sound s = Array.Find(sounds, sound => sound.name == name);
        if (s != null) return Add3DSourceToObject(go, s);
        Debug.LogWarning("Sound: " + name + " not found!");
        return null;
    }
    
    public AudioSource RequestSource(GameObject go, string name)
    {
        Sound s = Array.Find(sounds, sound => sound.name == name);
        if (s != null) return AddSourceToObject(go, s);
        Debug.LogWarning("Sound: " + name + " not found!");
        return null;
    }

    public AudioSource Add3DSourceToObject(GameObject go, Sound s)
    {
        AudioSource newSource = AddSourceToObject(go, s);
        newSource.spatialBlend = 1f;
        return newSource;
    }
    
    public AudioSource AddSourceToObject(GameObject go, Sound s)
    {
        AudioSource newSource = go.AddComponent<AudioSource>();
        newSource.clip = s.clip;
        newSource.pitch = s.pitch;
        newSource.volume = s.volume;
        newSource.ignoreListenerPause = !s.pauseable;
        newSource.loop = s.loop;
        
        switch (s.mixGroup)
        {
            default:
            case AudioLayer.Effects:
                newSource.outputAudioMixerGroup = fx;
                break;
            case AudioLayer.Music:
                newSource.outputAudioMixerGroup = music;
                break;
            case AudioLayer.UI:
                newSource.outputAudioMixerGroup = ui;
                break;
        }

        return newSource;
    }

    //Multiplies all pitches by a given float
    //Preserves user-defined pitches
    private void AdjustFxPitches(float pitch)
    {
        mixer.SetFloat("EffectsPitch", pitch);
    }
    
    //Adjusts fx pitches based on timeScale
    private void TimeScalePitches()
    {
        if (TimeHandler.timeMode > TimeMode.Slow)
            AdjustFxPitches(Mathf.Lerp(slowPitch, realPitch, TimeHandler.transitionProgress));
    }

    //Adjusts pitches based on TimeMode
    private void TimeModePitches()
    {
        switch (TimeHandler.timeMode)
        {
            case TimeMode.Real:
                AdjustFxPitches(1f);
                break;
            case TimeMode.Slow:
                AdjustFxPitches(0.5f);
                break;
        }
    }

    private void Pause()
    {
        AudioListener.pause = true;
    }

    private void UnPause()
    {
        AudioListener.pause = false;
    }

    private void OnDestroy()
    {
        if (audioManager == this)
        {
            TimeHandler.onRefreshTime -= TimeScalePitches;
            TimeHandler.onRealTime -= TimeModePitches;
            TimeHandler.onSlowTime -= TimeModePitches;
            TimeHandler.onPause -= Pause;
            TimeHandler.onResume -= UnPause;
        }
    }
}
