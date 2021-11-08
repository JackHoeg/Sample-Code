using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class FullWindow : MonoBehaviour
{
    private static bool _isFullscreen;

    public static bool IsFullScreen
    {
        get => _isFullscreen;
        set
        {
            _isFullscreen = value;
            //Screen.SetResolution(1280, 720, _isFullscreen);
            Screen.fullScreen = value;
        }
    }

    //Can be assigned to button
    public void SetFullscreen(bool f)
    {
        Screen.fullScreen = f;
    }

    //Can be assigned to button
    public void SwapScreen()
    {
        Screen.fullScreen = !Screen.fullScreen;
    }
}
