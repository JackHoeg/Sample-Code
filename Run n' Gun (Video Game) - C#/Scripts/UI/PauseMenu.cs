using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

public class PauseMenu : MonoBehaviour
{
    public GameObject pauseMenuUI;
    public GameObject audioSettingsUI;
    public string quitLocation;
    
    private TimeHandler timeHandler;

    public RectTransform resumeButton;
    public RectTransform restartButton;
    public RectTransform quitButton;
    public RectTransform settingsButton;
    public RectTransform helpButton;

    private Camera cam;
    // Start is called before the first frame update
    private void Start()
    {
        TimeHandler.onPause += Activate;
        TimeHandler.onResume += Deactivate;

        timeHandler = GameObject.Find("Player").GetComponent<TimeHandler>();
        if (timeHandler == null)
        {
            Debug.LogError("PauseMenu could not find Player or TimeHandler within Player");
            Destroy(gameObject);
        }

        cam = Camera.main;
        Deactivate();
    }

    private void OnDestroy()
    {
        TimeHandler.onPause -= Activate;
        TimeHandler.onResume -= Deactivate;
    }

    //enables pauseMenuUI
    private void Activate()
    {
        pauseMenuUI.SetActive(true);
        Vector2 cursorScreen = cam.ScreenToViewportPoint(Input.mousePosition);
        cursorScreen.x -= 0.5f;
        cursorScreen.x *= Screen.width;
        cursorScreen.y -= 0.5f;
        cursorScreen.y *= Screen.height;

        PositionResume(cursorScreen);
        quitButton.anchoredPosition = -resumeButton.anchoredPosition;
        
        //Position settings button
        Vector2 settingsPos = settingsButton.anchoredPosition;
        if (resumeButton.anchoredPosition.x >= 0)
        {
            if (resumeButton.anchoredPosition.y >= 0)
                settingsPos.x = -Mathf.Abs(settingsPos.x);
            else
                settingsPos.x = Mathf.Abs(settingsPos.x);
        }
        else if (resumeButton.anchoredPosition.x < 0)
        {
            if (resumeButton.anchoredPosition.y < 0)
                settingsPos.x = -Mathf.Abs(settingsPos.x);
            else
                settingsPos.x = Mathf.Abs(settingsPos.x);
        }
        
        
        else if (resumeButton.anchoredPosition.x < 0 && settingsPos.x < 0)
            settingsPos.x = -settingsPos.x;
        settingsButton.anchoredPosition = settingsPos;
        helpButton.anchoredPosition = -settingsPos;
        AudioManager.audioManager.Play("Pause");
    }
    
    //disables pauseMenuUI
    private void Deactivate()
    {
        pauseMenuUI.SetActive(false);
    }

    public void ResumeGame()
    {
        timeHandler.EnterResume();
    }

    public void RestartLevel()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
    }

    public void ExitLevel()
    {
        SceneManager.LoadScene(quitLocation);
    }

    public void EnterAudioSettings()
    {
        resumeButton.gameObject.SetActive(false);
        restartButton.gameObject.SetActive(false);
        quitButton.gameObject.SetActive(false);
        settingsButton.gameObject.SetActive(false);
        
        audioSettingsUI.SetActive(true);
    }
    
    public void ExitAudioSettings()
    {
        resumeButton.gameObject.SetActive(true);
        restartButton.gameObject.SetActive(true);
        quitButton.gameObject.SetActive(true);
        settingsButton.gameObject.SetActive(true);
        
        audioSettingsUI.SetActive(false);
    }

    //TODO: make this function work universally
    //positions resume button based given point
    private void PositionResume(Vector2 cs)
    {
        Vector2 buttonPos = cs;

        //ensures buttons are onscreen
        var sizeDelta = resumeButton.sizeDelta;
        float maxX = (Screen.width - sizeDelta.x) * 0.5f;
        float maxY = (Screen.height - sizeDelta.y) * 0.5f;
        if (Mathf.Abs(buttonPos.x) >= Mathf.Abs(maxX) || Mathf.Abs(buttonPos.y) >= Mathf.Abs(maxY))
        {
            float xRat = buttonPos.x / maxX;
            float yRat = buttonPos.y / maxY;

            float angle = Mathf.Atan2(buttonPos.y, buttonPos.x);
            if (Math.Abs(xRat) >= Math.Abs(yRat))
            {
                float hypot = maxX / Mathf.Cos(angle);
                buttonPos = cs.normalized * Mathf.Abs(hypot);
            }
            else
            {
                float hypot = maxY / Mathf.Sin(angle);
                buttonPos = cs.normalized * Mathf.Abs(hypot);
            }
        }
        
        //checks if button overlaps with restartButton
        Vector2 mins = (sizeDelta + restartButton.sizeDelta) * 0.5f;
        if (Mathf.Abs(buttonPos.x) <= Mathf.Abs(mins.x) && Mathf.Abs(buttonPos.y) <= Mathf.Abs(mins.y))
        {
            float xRat = buttonPos.x / mins.x;
            float yRat = buttonPos.y / mins.y;

            float angle = Mathf.Atan2(buttonPos.y, buttonPos.x);
            if (Math.Abs(xRat) >= Math.Abs(yRat))
            {
                float hypot = mins.x / Mathf.Cos(angle);
                buttonPos = cs.normalized * Mathf.Abs(hypot);
            }
            else
            {
                float hypot = mins.y / Mathf.Sin(angle);
                buttonPos = cs.normalized * Mathf.Abs(hypot);
            }
        }
        
        resumeButton.anchoredPosition = buttonPos;
    }
}
