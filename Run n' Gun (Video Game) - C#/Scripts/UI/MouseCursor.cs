using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MouseCursor : MonoBehaviour
{
    public Texture2D cursorTex;
    public bool useCustom;

    // Start is called before the first frame update
    void Start()
    {
        if (useCustom)
            SetCustom();
        else
            SetDefault();

        if (useCustom)
        {
            TimeHandler.onResume += SetCustom;
            TimeHandler.onPause += SetDefault;
        }
    }

    private void OnDestroy()
    {
        if (useCustom)
        {
            TimeHandler.onResume -= SetCustom;
            TimeHandler.onPause -= SetDefault;
        }
    }

    void SetCustom()
    {
        Vector2 hotspot = new Vector2(cursorTex.width / 2f, cursorTex.height / 2f);
        Cursor.SetCursor(cursorTex, hotspot, CursorMode.Auto);
    }

    void SetDefault()
    {
        Cursor.SetCursor(null, Vector2.zero, CursorMode.Auto);
    }
}
