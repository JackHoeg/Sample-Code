using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Pathfinding;
using Random = UnityEngine.Random;

/*
 * Everything in this class is private,
 * so why not put it in the Enemy class?
 */
public class EnemyAI : MonoBehaviour
{
    public enum State {
        Roaming,
        ChaseTarget,
        Idle,
    }

    private State state;
    private GameObject player;
    private AIDestinationSetter aids;
    private WanderingDestinationSetter wds;
    private Enemy enmy; //probably should make everything a part of Enemy
    [HideInInspector]
    public AISettings aiSettings; //maybe make this private
    public AISettings easyAi;
    public AISettings normalAi;
    public AISettings hardAi;
    private RaycastHit2D[] sightTestResults;
    private int layerMask;
    private bool canSeePlayer;
    private bool canAttack;
    private float lastSeen = -100;
    private bool searching = false;
    public State defaultState = State.Roaming;
    private Transform startingPos;

    private void Awake()
    {
        state = defaultState;
        player = GameObject.Find("Player");
        layerMask = LayerMask.GetMask("Obstacle", "Default");
        sightTestResults = new RaycastHit2D[aiSettings.maxRayCol];
        aids = GetComponent<AIDestinationSetter>();
        wds = GetComponent<WanderingDestinationSetter>();
        enmy = GetComponent<Enemy>();
        if (defaultState == State.Idle)
        {
            GameObject enmyDefault = new GameObject();
            enmyDefault.transform.position = transform.position;
            startingPos = enmyDefault.transform;
        }

        aids.target = player.transform;
        aids.enabled = false;
        wds.enabled = defaultState != State.Idle;
        
        UpdateDifficulty();
        DifficultySettings.onChangeDifficulty += UpdateDifficulty;
    }

    // Update is called once per frame
    void Update()
    {
        if (TimeHandler.isPaused) return;
        FindTarget();
        if (!canSeePlayer) return;
        enmy.Aim(player.transform.position);
        if (canAttack && Random.value <= aiSettings.chanceToFire)
            enmy.Fire();
    }
    
    private void RefreshRaycast()
    {
        Vector2 start = transform.position;
        Vector2 direction = ((Vector2)player.transform.position - start).normalized;
        bool atk = true;
        bool see = false;
        Physics2D.RaycastNonAlloc(start, direction, sightTestResults, aiSettings.targetRange, layerMask);
        
        
        foreach (var t in sightTestResults)
        {
            if (!t)
                break;
            //Check if obstacle in the way
            if (t.collider.CompareTag("obstacle"))
            {
                atk = false;
                see = false;
                break;
            }
            
            //check if other enemy in the way
            if (atk && t.collider.CompareTag("enemy"))
            {
                if (t.collider.gameObject != gameObject)
                {
                    atk = false;
                }
            }

            //check if play is seen
            else if (t.collider.CompareTag("Player"))
            {
                see = true;
                if (t.distance > enmy.GetAtkRng())
                    atk = false;
                break;
            }
        }

        canAttack = atk;
        canSeePlayer = see;
    }

    private void FindTarget()
    {
        RefreshRaycast();
        if (canSeePlayer) {
            //Player is seen within target range
            if (state != State.ChaseTarget)
            {
                state = State.ChaseTarget;
                aids.target = player.transform;
                aids.enabled = true;
                wds.enabled = false;
            }
        } else
        {
            if (state != defaultState)
            {
                if (!searching)
                {
                    searching = true;
                    lastSeen = Time.time;
                } else if (Time.time - lastSeen >= aiSettings.searchTime)
                {
                    searching = false;
                    state = defaultState;
                    if (defaultState == State.Roaming)
                    {
                        aids.enabled = false;
                        wds.enabled = true;
                    }
                    else
                    {
                        aids.enabled = true;
                        aids.target = startingPos;
                        wds.enabled = false;
                    }

                    enmy.ResetAim();
                }
            }
        }
    }

    private void OnCollisionStay2D()
    {
        if (state != State.ChaseTarget && aiSettings.chanceToFire != 0f)
        {
            wds.PickRandomTarget();
        }
    }

    private void UpdateDifficulty()
    {
        switch (DifficultySettings.DifficultyLevel)
        {
            default:
            case Difficulty.Normal:
                aiSettings = normalAi;
                break;
            case Difficulty.Easy:
                aiSettings = easyAi;
                break;
            case Difficulty.Hard:
                aiSettings = hardAi;
                break;
        }
    }

    private void OnDestroy()
    {
        DifficultySettings.onChangeDifficulty -= UpdateDifficulty;
    }
}
