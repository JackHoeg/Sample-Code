using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;

public class LevelSelectHandler : MonoBehaviour
{
    public GameObject buttonPrefab;
    public Vector2 startingPoint;
    public Vector2 margin;

    [System.Serializable]
    public struct Buttn
    {
        public string displayName;
        public string directName;
    }
    
    public Buttn[] buttonList;
    
    // Start is called before the first frame update
    void Start()
    {
        RectTransform tmpRect = GetComponent<RectTransform>();
        RectTransform refRect = buttonPrefab.GetComponent<RectTransform>();
        float totalHeight = refRect.sizeDelta.y + Mathf.Abs((buttonList.Length - 1) * margin.y) + Mathf.Abs(startingPoint.y * 2f / 3f);
        tmpRect.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, totalHeight);
        
        for (byte i = 0; i < buttonList.Length; i++)
        {
            GameObject newButton = Instantiate(buttonPrefab, transform);
            newButton.name = buttonList[i].displayName;
            var i1 = i;
            newButton.GetComponent<Button>().onClick.AddListener(
                delegate { LoadLevel(buttonList[i1].directName);});
            newButton.GetComponentInChildren<Text>().text = buttonList[i].displayName;
            RectTransform myRect = newButton.GetComponent<RectTransform>();
            myRect.anchoredPosition = startingPoint + (margin * i);
        }
        
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    void LoadLevel(string level)
    {
        SceneManager.LoadScene(level);
    }
}
