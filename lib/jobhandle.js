//
// Copyright 2022 Robert Dyer,
//                and University of Nebraska Board of Regents
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

/**
 * Status of a Boa job's compilation.
 */
const CompilerStatus = {
  WAITING: 'Waiting',
  RUNNING: 'Running',
  FINISHED: 'Finished',
  ERROR: 'Error',
};
module.exports.CompilerStatus = CompilerStatus;

/**
 * Status of a Boa job's execution.
 */
const ExecutionStatus = {
  WAITING: 'Waiting',
  RUNNING: 'Running',
  FINISHED: 'Finished',
  ERROR: 'Error',
};
module.exports.ExecutionStatus = ExecutionStatus;

/**
 * An immutable handle to a Boa job.
 */
class JobHandle {
  #client = null;
  #id = -1;
  #submitted = Date.now();
  #input = {};
  #compilerStatus = '';
  #executionStatus = '';

  /**
    * Create a new job handle.
    * @param {*} client
    * @param {*} id
    * @param {*} submitted
    * @param {*} input
    * @param {*} compilerStatus
    * @param {*} executionStatus
    */
  constructor(client, id, submitted, input, compilerStatus, executionStatus) {
    this.#client = client;
    this.#id = id;
    this.#submitted = new Date(submitted);
    this.#input = input;
    this.#compilerStatus = compilerStatus;
    this.#executionStatus = executionStatus;
  }

  /**
   * The job's unique ID.
   */
  get id() {
    return this.#id;
  }

  /**
   * The time the job was submitted.
   */
  get submitted() {
    return this.#submitted;
  }

  /**
   * The dataset this job queried.
   */
  get input() {
    return this.#input;
  }

  /**
   * The status of the job's compilation.
   */
  get compilerStatus() {
    return this.#compilerStatus;
  }

  /**
   * The status of the job's execution.
   */
  get executionStatus() {
    return this.#executionStatus;
  }

  /**
   * Used for debug printing a job handle.
   * @return {string}
   */
  get [Symbol.toStringTag]() {
    return `id: ${this.#id}, ` +
        `submitted: '${this.#submitted.toString()}', ` +
        `input: '${this.#input.name}', ` +
        `compilerStatus: '${this.#compilerStatus}', ` +
        `executionStatus: '${this.#executionStatus}'`;
  }

  /**
   * Stops the job, if it is running.
   */
  stop() {
    throw Error('not implemented yet');
  }

  /**
   *
   */
  resubmit() {
    throw Error('not implemented yet');
  }

  /**
   *
   */
  delete() {
    throw Error('not implemented yet');
  }

  /**
   *
   * @return {*}
   */
  isRunning() {
    return this.#compilerStatus == CompilerStatus.RUNNING ||
      this.#executionStatus == ExecutionStatus.RUNNING ||
      this.#compilerStatus == CompilerStatus.WAITING ||
      (this.#executionStatus == ExecutionStatus.WAITING &&
        this.#compilerStatus == CompilerStatus.FINISHED);
  };

  /**
   * Refresh the job's cached data.
   */
  async refresh() {
    const job = await this.#client.getJob(this.#id);
    this.#compilerStatus = job.compilerStatus;
    this.#executionStatus = job.executionStatus;
    this.#submitted = job.submitted;
  }

  /**
   * Waits for a job to finish executing.
   * @return {boolean} if the job succeeded
   */
  async wait() {
    while (this.isRunning()) {
      await new Promise((r) => setTimeout(r, 2000));
      await this.refresh();
    }
    return this.#compilerStatus != CompilerStatus.ERROR &&
        this.#executionStatus != ExecutionStatus.ERROR;
  }

  /**
   *
   */
  get url() {
    throw Error('not implemented yet');
  }

  /**
   *
   */
  get public() {
    throw Error('not implemented yet');
  }

  /**
   *
   * @param {boolean} pub
   */
  set public(pub) {
    throw Error('not implemented yet');
  }

  /**
   *
   */
  get publicUrl() {
    throw Error('not implemented yet');
  }

  /**
   *
   */
  get source() {
    throw Error('not implemented yet');
  }

  /**
   *
   */
  get output() {
    throw Error('not implemented yet');
  }

  /**
   *
   */
  get compilerErrors() {
    throw Error('not implemented yet');
  }

  /**
   *
   */
  get outputSize() {
    throw Error('not implemented yet');
  }
};
module.exports.JobHandle = JobHandle;

/**
 * Parses the response object and converts to a {JobHandle}.
 * @param {*} client - a Boa API client
 * @param {*} job - the job response to parse
 * @return {JobHandle} a handle to the job
 */
module.exports.parseJob = function parseJob(client, job) {
  return new JobHandle(
      client,
      job.id,
      job.submitted,
      job.input,
      job.compiler_status,
      job.hadoop_status,
  );
};
