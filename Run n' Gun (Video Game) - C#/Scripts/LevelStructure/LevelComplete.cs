using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

public class LevelComplete : MonoBehaviour
{
    public static int currentScene;
    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    void Update()
    {
        checkIfReachedEnd();
    }

    public void loadNextScene()
    {
        if(currentScene + 1 < SceneManager.sceneCountInBuildSettings-1)
        {
            SceneManager.LoadScene(currentScene + 1);
            Debug.Log("Attempting to load next scene");
        }
    }

    public void loadLevelSelect()
    {
        SceneManager.LoadScene("Level Select");
    }

    private void checkIfReachedEnd()
    {
        if (currentScene + 1 >= SceneManager.sceneCountInBuildSettings - 1)
        {
            changeText();
        }
    }

    private void changeText()
    {
        Text levelComplete = GameObject.Find("LevelComplete").GetComponent<Text>();
        levelComplete.text = "Final Level Completed!";
        levelComplete.fontSize = 90;

        GameObject nextLevelButton = GameObject.Find("NextLevel");
        Destroy(nextLevelButton);

        GameObject levelSelect = GameObject.Find("LevelSelect");
        levelSelect.transform.position = new Vector3(Screen.width/2, Screen.height/2, 0);
    }
}
