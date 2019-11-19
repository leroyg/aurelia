import { JobQueue, Job } from './job';
import { $SourceFile } from './ast';
import { DI, IContainer, ILogger } from '@aurelia/kernel';
import { Realm, ExecutionContext } from './realm';
import { $Any } from './types/_shared';
import { $Empty } from './types/empty';

export const ISourceFileProvider = DI.createInterface<ISourceFileProvider>('ISourceFileProvider').noDefault();
export interface ISourceFileProvider {
  GetSourceFiles(): Promise<readonly $SourceFile[]>;
}

// http://www.ecma-international.org/ecma-262/#sec-agents
export class Agent {
  public readonly ScriptJobs: JobQueue;
  public readonly PromiseJobs: JobQueue;

  public constructor(
    public readonly logger: ILogger,
  ) {
    this.ScriptJobs = new JobQueue(logger, 'Script');
    this.PromiseJobs = new JobQueue(logger, 'Promise');
  }

  // http://www.ecma-international.org/ecma-262/#sec-runjobs
  public async RunJobs(container: IContainer): Promise<$Any> {
    // 1. Perform ? InitializeHostDefinedRealm().
    const realm = Realm.Create(container);
    const intrinsics = realm['[[Intrinsics]]'];
    const stack = realm.stack;
    // We always have 1 synthetic root context which should not be considered to be a part of the stack.
    // It's exclusively used for initializing intrinsics, to conform to the method signatures.
    const rootCtx = stack.top;

    // 2. In an implementation-dependent manner, obtain the ECMAScript source texts (see clause 10) and any associated host-defined values for zero or more ECMAScript scripts and/or ECMAScript modules. For each such sourceText and hostDefined, do
    const sfProvider = container.get(ISourceFileProvider);
    const sourceFiles = await sfProvider.GetSourceFiles();
    for (const sourceFile of sourceFiles) {
      // 2. a. If sourceText is the source code of a script, then
      if (false) { // Leave this branch be, we need to implement it eventually
        // 2. a. i. Perform EnqueueJob("ScriptJobs", ScriptEvaluationJob, « sourceText, hostDefined »).
      }
      // 2. b. Else sourceText is the source code of a module,
      else {
        // 2. b. i. Perform EnqueueJob("ScriptJobs", TopLevelModuleEvaluationJob, « sourceText, hostDefined »).
        this.ScriptJobs.EnqueueJob(rootCtx, new TopLevelModuleEvaluationJob(this.logger, realm, sourceFile));
      }
    }

    let ctx = rootCtx;

    // 3. Repeat,
    while (true) {
      // 3. a. Suspend the running execution context and remove it from the execution context stack.
      if (ctx !== rootCtx) {
        ctx.suspend();
        stack.pop();
      }

      let nextPending: Job;

      // 3. b. Assert: The execution context stack is now empty.
      // 3. c. Let nextQueue be a non-empty Job Queue chosen in an implementation-defined manner. If all Job Queues are empty, the result is implementation-defined.
      if (this.ScriptJobs.isEmpty) {
        if (this.PromiseJobs.isEmpty) {
          this.logger.debug(`Finished successfully`);
          return new $Empty(realm);
        } else {
          // 3. d. Let nextPending be the PendingJob record at the front of nextQueue. Remove that record from nextQueue.
          nextPending = this.PromiseJobs.queue.shift()!;
        }
      } else {
        // 3. d. Let nextPending be the PendingJob record at the front of nextQueue. Remove that record from nextQueue.
        nextPending = this.ScriptJobs.queue.shift()!;
      }

      // 3. e. Let newContext be a new execution context.
      const newContext = new ExecutionContext(nextPending['[[Realm]]']);

      // 3. f. Set newContext's Function to null.
      newContext.Function = intrinsics.null;

      // 3. g. Set newContext's Realm to nextPending.[[Realm]].
      // 3. h. Set newContext's ScriptOrModule to nextPending.[[ScriptOrModule]].
      newContext.ScriptOrModule = nextPending['[[ScriptOrModule]]'];

      // 3. i. Push newContext onto the execution context stack; newContext is now the running execution context.
      stack.push(newContext);

      // 3. j. Perform any implementation or host environment defined job initialization using nextPending.
      // 3. k. Let result be the result of performing the abstract operation named by nextPending.[[Job]] using the elements of nextPending.[[Arguments]] as its arguments.
      const result = nextPending.Run(newContext);

      // 3. l. If result is an abrupt completion, perform HostReportErrors(« result.[[Value]] »).
      if (result.isAbrupt) {
        this.logger.debug(`Job completed with errors`);
        return result;
      }
    }
  }
}

export class TopLevelModuleEvaluationJob extends Job {
  // http://www.ecma-international.org/ecma-262/#sec-toplevelmoduleevaluationjob
  public Run(ctx: ExecutionContext): $Any {
    this.logger.debug(`Run(#${ctx.id})`);

    const m = this['[[ScriptOrModule]]'];

    // 1. Assert: sourceText is an ECMAScript source text (see clause 10).
    // 2. Let realm be the current Realm Record.
    // 3. Let m be ParseModule(sourceText, realm, hostDefined).
    // 4. If m is a List of errors, then
      // 4. a. Perform HostReportErrors(m).
      // 4. b. Return NormalCompletion(undefined).

    // 5. Perform ? m.Instantiate().
    let result = m.Instantiate();
    if (result.isAbrupt) {
      return result;
    }

    // 6. Assert: All dependencies of m have been transitively resolved and m is ready for evaluation.
    // 7. Return ? m.Evaluate().
    return m.EvaluateModule();
  }
}
