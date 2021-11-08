using System;
using System.Collections;
using System.Collections.Generic;
using System.Numerics;
using UnityEngine;
using UnityEngine.SceneManagement;
using Random = UnityEngine.Random;
using Vector2 = UnityEngine.Vector2;

public class Player : Character
{
    private Rigidbody2D rb;
    private Camera cam;
    private Vector2 mouseWorldPoint;

    public PlayerSettings settings;
    public TimeHandler bulletTime;

    //acts like pointer to appropriate move function
    private delegate void MoveDel();
    private MoveDel move;

    //handles FireMode
    private delegate bool FireDel();
    private FireDel fireCheck;

    private Vector2 btDir; //stores direction of bullet time
    private float btMag; //stores speed of bullet time

    private float mouseDist;
    public float healthReductionSpeed;

    private Animator anim;
    private readonly int killHash = Animator.StringToHash("Dissolve");
    
    // Start is called before the first frame update
    void Start()
    {
        rb = GetComponent<Rigidbody2D>();
        cam = Camera.main;
        gun = GetComponentInChildren<Weapon>();
        mouseWorldPoint = cam.ScreenToWorldPoint(Input.mousePosition);

        gun.transform.position = transform.TransformPoint(characterSettings.gunLocation);
        bulletTime = GetComponent<TimeHandler>();

        anim = GetComponent<Animator>();
        if (anim == null)
        {
            Debug.LogError("PLAYER EXPECTED ANIMATOR");
        }
        
        InitializeCharacterAttributes();
        PickMove();
        PickFireCheck();
        assign = PickFireCheck;
        
        TimeHandler.onRealTime += PickMove;
        TimeHandler.onEaseIn += PickMove;
        TimeHandler.onEaseOut += PickMove;
        
        StatTracker.EnemiesKilled = 0;
    }

    // Update is called once per frame
    void Update()
    {
        if (TimeHandler.isPaused) return;
        if (Input.GetKeyDown(KeyCode.Escape))
            bulletTime.PauseResume();
        if (isKilled) return;
        Controls();
        if (health > characterSettings.maxHealth)
            reduceHealth();
    }
    
    // Handles all non-cursor user-input
    private void Controls()
    {
        LookAtCursor(); 
        move();
        gun.Aim(mouseWorldPoint);
        
        // Fire Gun
        if (fireCheck())
            gun.Fire();

        if (Input.GetButtonDown("BulletTime"))
        {
            bulletTime.CycleMode();
        }
    }
    
    // Points Player toward mouse position
    private void LookAtCursor()
    {
        //gets the mouse position as a world point
        mouseWorldPoint = cam.ScreenToWorldPoint(Input.mousePosition);
        mouseDist = Vector2.SqrMagnitude((Vector2) transform.position - mouseWorldPoint);
        if (mouseDist >= settings.minMouse)
            Helper.LookAt2DSmooth(transform, mouseWorldPoint, settings.rotSmooth * Time.deltaTime);
    }

    //computes speed based on mouse location
    private float _CalcSpeed()
    {
        mouseDist = Vector2.SqrMagnitude((Vector2) transform.position - mouseWorldPoint);
        if (mouseDist < settings.outerRadius)
        {
            if (mouseDist < settings.innerRadius)
            {
                return settings.minSpeed;
            } 
            
            float range = settings.outerRadius - settings.innerRadius;
            mouseDist -= settings.innerRadius; //this line won't work if innerRad != 1...oops
            
            //TODO: replace division with multiplication
            mouseDist /= range; //gets distance in [0,1] for speed lerp

            return Mathf.Lerp(settings.minSpeed, settings.maxSpeed, mouseDist);
        }
        else
        {
            return settings.maxSpeed;
        }
    }

    // Moves player in current direction
    private void StandardMove()
    {
        rb.velocity = transform.up * _CalcSpeed();
    }

    //moves player in bullet time direction
    private void BulletTimeMove()
    {
        //TODO: allow forces to impact velocity (except for shooting self)
        rb.velocity = btDir * btMag;
    }

    //blends between bullet time and standard moves
    private void OutMove()
    {
        Vector2 mDir = (Vector2) transform.up * _CalcSpeed();
        rb.velocity = Vector2.Lerp(btDir * btMag, mDir, TimeHandler.transitionProgress);
    }

    // Sets move based on timeMode
    private void PickMove()
    {
        switch (TimeHandler.timeMode)
        {
            case TimeMode.Real:
                move = StandardMove;
                break;
            case TimeMode.EaseIn:
                move = BulletTimeMove;
                btDir = transform.up;
                btMag = rb.velocity.magnitude;
                break;
            case TimeMode.EaseOut:
                move = OutMove;
                break;
        }
    }
    
    // sets FireCheck based on gun fire mode
    // CALL EVERY TIME A GUN IS EQUIPPED
    private void PickFireCheck()
    {
        switch (gun.stats.fireMode)
        {
            case FireMode.Semi:
                fireCheck = () => Input.GetButtonDown("Fire");
                break;
            case FireMode.Auto:
            case FireMode.Charge:
                fireCheck = () => Input.GetButton("Fire");
                break;
        }
    }

    private void OnCollisionEnter2D(Collision2D other)
    {
        if (TimeHandler.timeMode == TimeMode.EaseIn || TimeHandler.timeMode == TimeMode.Slow)
        {
            bulletTime.EnterEaseOut();
            
            Vector2 vel = rb.velocity;
            btDir = vel.normalized;
            btMag = vel.magnitude;
        }

        if (other.gameObject.CompareTag("enemy"))
        {
            BulletImpact bi;
            bi.damage = settings.enemyCollideDamage;
            bi.col = other;
            TakeDamage(bi);
        }
    }

    public override void TakeDamage(BulletImpact bi)
    {
        base.TakeDamage(bi);
        StatTracker.PlayerHealth = health;
        int soundChoice = Random.Range(0, 2);
        if(soundChoice == 1)
        {
            AudioManager.audioManager.Play("Hit1");
        }
        else
        {
            AudioManager.audioManager.Play("Hit2");
        }
    }

    public void addHealth(float addedHealth)
    {
        if(health +addedHealth > (2*characterSettings.maxHealth))
        {
            health = 2 * characterSettings.maxHealth;
        }
        else
        {
            health += addedHealth;
        }
        StatTracker.PlayerHealth = health;
    }

    private void reduceHealth()
    {
        health -= healthReductionSpeed * Time.deltaTime;
        StatTracker.PlayerHealth = health;
    }

    protected override void Kill()
    { 
        if (isKilled) return;
        AudioManager.audioManager.Play("Shatter");
        isKilled = true;
        DiscardWeapon();
        if (TimeHandler.timeMode != TimeMode.Real)
            bulletTime.EnterReal();

        BTEffect child = GetComponentInChildren<BTEffect>();
        child.enabled = false;
        child.gameObject.GetComponent<Animator>().enabled = false;

        rb.freezeRotation = false;

        anim.Play(killHash);
        gameObject.tag = "Untagged";
        
        //TODO: This is too much dependency
        cam.GetComponent<Animator>().Play("FollowStop");
    }

    private void Reload()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
    }

    private void OnApplicationPause(bool pauseStatus)
    {
        if (pauseStatus && !TimeHandler.isPaused)
            bulletTime.PauseResume();
    }

    private void OnDestroy()
    {
        TimeHandler.onRealTime -= PickMove;
        TimeHandler.onEaseIn -= PickMove;
        TimeHandler.onEaseOut -= PickMove;
        StatTracker.KeysCollected = 0;
        StatTracker.time = Time.time;
        StatTracker.EnemiesKilled = 0;
        StatTracker.EnemyCount = 0;
        StatTracker.PlayerHealth = characterSettings.maxHealth;
        DifficultySettings.onChangeDifficulty -= UpdateDifficulty;
    }
}
