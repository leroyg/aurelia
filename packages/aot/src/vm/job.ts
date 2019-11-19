import { ILogger } from '@aurelia/kernel';
import { $AnyNonEmpty, $Any } from './types/_shared'
import { Realm, ExecutionContext } from './realm';
import { $SourceFile } from './ast';
import { $Empty } from './types/empty';

// http://www.ecma-international.org/ecma-262/#table-25
export abstract class Job {
  public '[[Arguments]]': readonly $AnyNonEmpty[];
  public '[[Realm]]': Realm;
  public '[[ScriptOrModule]]': $SourceFile;

  public constructor(
    public readonly logger: ILogger,
    $arguments: readonly $AnyNonEmpty[],
    realm: Realm,
    scriptOrModule: $SourceFile,
  ) {
    this.logger = logger.scopeTo(`Job`);

    this['[[Arguments]]'] = $arguments;
    this['[[Realm]]'] = realm;
    this['[[ScriptOrModule]]'] = scriptOrModule;
  }

  public abstract Run(ctx: ExecutionContext): $Any;
}

export abstract class JobQueue {
  public readonly queue: Job[] = [];

  public get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public constructor(
    public readonly logger: ILogger,
    public readonly name: string,
  ) {
    this.logger = logger.root.scopeTo(`JobQueue['${name}']`);
  }

  // http://www.ecma-international.org/ecma-262/#sec-enqueuejob
  public EnqueueJob(
    ctx: ExecutionContext,
    $arguments: readonly $AnyNonEmpty[],
  ): $Empty {
    const realm = ctx.Realm;

    this.logger.debug(`EnqueueJob(#${ctx.id}) currentQueueLength=${this.queue.length}`);

    // 1. Assert: Type(queueName) is String and its value is the name of a Job Queue recognized by this implementation.
    // 2. Assert: job is the name of a Job.
    // 3. Assert: arguments is a List that has the same number of elements as the number of parameters required by job.
    // 4. Let callerContext be the running execution context.
    // 5. Let callerRealm be callerContext's Realm.
    // 6. Let callerScriptOrModule be callerContext's ScriptOrModule.
    // 7. Let pending be PendingJob { [[Job]]: job, [[Arguments]]: arguments, [[Realm]]: callerRealm, [[ScriptOrModule]]: callerScriptOrModule, [[HostDefined]]: undefined }.
    const pending = this.createJob(ctx, $arguments);

    // 8. Perform any implementation or host environment defined processing of pending. This may include modifying the [[HostDefined]] field or any other field of pending.
    // 9. Add pending at the back of the Job Queue named by queueName.
    this.queue.push(pending);

    // 10. Return NormalCompletion(empty).
    return new $Empty(realm);
  }

  public abstract createJob(
    ctx: ExecutionContext,
    $arguments: readonly $AnyNonEmpty[],
  ): Job;
}