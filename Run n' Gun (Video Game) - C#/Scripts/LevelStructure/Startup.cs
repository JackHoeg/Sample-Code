using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

public class Startup : MonoBehaviour
{
    public string forwardLevel; 
    
    void Awake()
    {
        //FullWindow.IsFullScreen = false;
        Screen.SetResolution(1280, 720, false);
        SceneManager.LoadScene(forwardLevel);
    }
}
